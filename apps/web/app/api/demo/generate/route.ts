import { isIP } from "node:net";
import { aiConfigured, changelogModel, changelogSystemPrompt, changelogUserPrompt } from "@/lib/ai";
import { db } from "@/lib/db";
import { buildEnglishReasoningTrace, getDemoCacheKey, readDemoCache, renderFallbackChangelog, reserveDemoCache, resolvePublicDemo, writeDemoCache } from "@/lib/public-demo";
import { demoGenerationCache } from "@commitglow/db/schema";
import { streamText } from "ai";
import { and, eq, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

const demoLimit = 5;
const demoWindowMs = 60 * 60 * 1000;

function getRequestIp(request: Request) {
  const trusted = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip");

  if (trusted && isIP(trusted)) {
    return trusted;
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean).at(-1);

  if (forwarded && isIP(forwarded)) {
    return forwarded;
  }

  return "unknown";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));

  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function cleanupExpiredRateLimits(now: number) {
  if (Math.random() > 0.02) {
    return;
  }

  await db.delete(demoGenerationCache).where(and(eq(demoGenerationCache.owner, "demo-rate-limit"), lte(demoGenerationCache.updatedAt, new Date(now - demoWindowMs * 2))));
}

async function hitRateLimit(ip: string) {
  const now = Date.now();
  const keyHash = await sha256(ip);
  const cacheKey = `rate-limit:${keyHash}`;
  const nextResetAt = now + demoWindowMs;

  try {
    await cleanupExpiredRateLimits(now);

    const [current] = await db.select({ body: demoGenerationCache.body, metadata: demoGenerationCache.metadata }).from(demoGenerationCache).where(eq(demoGenerationCache.cacheKey, cacheKey)).limit(1);
    const metadata = current?.metadata && typeof current.metadata === "object" ? current.metadata as Record<string, unknown> : {};
    const currentResetAt = typeof metadata.resetAt === "string" ? Date.parse(metadata.resetAt) : 0;

    if (!current || currentResetAt <= now) {
      await db.insert(demoGenerationCache).values({
        cacheKey,
        provider: "github",
        owner: "demo-rate-limit",
        name: keyHash,
        branch: "global",
        commitFingerprint: "rate-limit",
        commitCount: 0,
        model: "rate-limit",
        body: "1",
        metadata: { status: "rate-limit", resetAt: new Date(nextResetAt).toISOString() },
      }).onConflictDoUpdate({
        target: demoGenerationCache.cacheKey,
        set: { body: "1", metadata: { status: "rate-limit", resetAt: new Date(nextResetAt).toISOString() }, updatedAt: new Date() },
      });

      return { limited: false, resetAt: nextResetAt };
    }

    const count = Number.parseInt(current.body, 10) || 0;

    if (count >= demoLimit) {
      return { limited: true, resetAt: currentResetAt };
    }

    await db.update(demoGenerationCache).set({ body: String(count + 1), updatedAt: new Date() }).where(eq(demoGenerationCache.cacheKey, cacheKey));

    return { limited: false, resetAt: currentResetAt };
  } catch {
    return { limited: false, resetAt: nextResetAt };
  }
}

function getReasoningTrace(result: unknown) {
  if (!result || typeof result !== "object") {
    return "";
  }

  const data = result as Record<string, unknown>;
  const reasoningText = data.reasoningText;

  if (typeof reasoningText === "string") {
    return reasoningText;
  }

  const reasoning = data.reasoning;

  if (typeof reasoning === "string") {
    return reasoning;
  }

  if (Array.isArray(reasoning)) {
    return reasoning.map((part) => typeof part === "string" ? part : part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? String((part as Record<string, unknown>).text) : "").join("");
  }

  return "";
}

function containsNonEnglishScript(value: string) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0900-\u097f]/u.test(value);
}

function englishOnly(value: string) {
  return containsNonEnglishScript(value) ? "" : value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDemoCache(cacheKey: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(750);
    const cached = await readDemoCache(cacheKey);

    if (cached) {
      return cached;
    }
  }

  return null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { repo?: unknown } | null;
  const repo = String(body?.repo ?? "").trim().slice(0, 300);

  if (!repo) {
    return NextResponse.json({ error: "Repository is required." }, { status: 400 });
  }

  const resolved = await resolvePublicDemo(repo);

  if (resolved.status === "error") {
    return NextResponse.json({ error: resolved.message }, { status: 400 });
  }

  const { repository, commits } = resolved;
  const { cacheKey, commitFingerprint } = await getDemoCacheKey({ repository, commits });
  const cached = await readDemoCache(cacheKey);

  if (cached) {
    return NextResponse.json({ body: cached.body, aiGenerated: cached.aiGenerated, reasoningTrace: cached.reasoningTrace, cached: true });
  }

  const limit = await hitRateLimit(getRequestIp(request));

  if (limit.limited) {
    return NextResponse.json({ error: "Rate limit reached for this IP.", resetAt: new Date(limit.resetAt).toISOString() }, { status: 429 });
  }

  const reservation = await reserveDemoCache({ repository, cacheKey, commitFingerprint, commits });

  if (reservation === "pending") {
    const completed = await waitForDemoCache(cacheKey);

    if (completed) {
      return NextResponse.json({ body: completed.body, aiGenerated: completed.aiGenerated, reasoningTrace: completed.reasoningTrace, cached: true });
    }

    return NextResponse.json({ pending: true, message: "This demo is already generating. The saved result will be reused when it finishes." }, { status: 202 });
  }

  if (!aiConfigured()) {
    const fallback = renderFallbackChangelog(commits);
    await writeDemoCache({ repository, cacheKey, commitFingerprint, commits, body: fallback, aiGenerated: false, reasoningTrace: buildEnglishReasoningTrace(commits) });

    return NextResponse.json({ body: fallback, aiGenerated: false, reasoningTrace: buildEnglishReasoningTrace(commits), cached: false });
  }

  const result = streamText({
    model: changelogModel,
    system: changelogSystemPrompt,
    prompt: changelogUserPrompt(commits),
    async onFinish(result) {
      await writeDemoCache({ repository, cacheKey, commitFingerprint, commits, body: result.text.trim(), aiGenerated: true, reasoningTrace: englishOnly(getReasoningTrace(result)) || buildEnglishReasoningTrace(commits) });
    },
  });

  return result.toUIMessageStreamResponse();
}
