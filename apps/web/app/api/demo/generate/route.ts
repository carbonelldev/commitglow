import { aiConfigured, changelogModel, changelogSystemPrompt, changelogUserPrompt } from "@/lib/ai";
import { buildEnglishReasoningTrace, getDemoCacheKey, readDemoCache, renderFallbackChangelog, reserveDemoCache, resolvePublicDemo, writeDemoCache } from "@/lib/public-demo";
import { streamText } from "ai";
import { NextResponse } from "next/server";

type RateLimitEntry = { count: number; resetAt: number };

const demoRateLimits = new Map<string, RateLimitEntry>();
const demoLimit = 5;
const demoWindowMs = 60 * 60 * 1000;

function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function hitRateLimit(ip: string) {
  const now = Date.now();
  const current = demoRateLimits.get(ip);

  if (!current || current.resetAt <= now) {
    demoRateLimits.set(ip, { count: 1, resetAt: now + demoWindowMs });
    return { limited: false, resetAt: now + demoWindowMs };
  }

  if (current.count >= demoLimit) {
    return { limited: true, resetAt: current.resetAt };
  }

  current.count += 1;
  return { limited: false, resetAt: current.resetAt };
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

  const limit = hitRateLimit(getRequestIp(request));

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
