import { getDemoCacheKey, resolvePublicDemo, writeDemoCache } from "@/lib/public-demo";
import { NextResponse } from "next/server";

function containsNonEnglishScript(value: string) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0900-\u097f]/u.test(value);
}

function englishOnly(value: string) {
  return containsNonEnglishScript(value) ? "" : value;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { repo?: unknown; markdown?: unknown; reasoningTrace?: unknown; aiGenerated?: unknown } | null;
  const repo = String(body?.repo ?? "").trim().slice(0, 300);
  const markdown = String(body?.markdown ?? "").trim().slice(0, 20000);
  const reasoningTrace = englishOnly(String(body?.reasoningTrace ?? "").trim().slice(0, 30000));
  const aiGenerated = body?.aiGenerated === true;

  if (!repo || markdown.length < 3) {
    return NextResponse.json({ error: "Repository and markdown are required." }, { status: 400 });
  }

  const resolved = await resolvePublicDemo(repo);

  if (resolved.status === "error") {
    return NextResponse.json({ error: resolved.message }, { status: 400 });
  }

  const { repository, commits } = resolved;
  const { cacheKey, commitFingerprint } = await getDemoCacheKey({ repository, commits });

  await writeDemoCache({ repository, cacheKey, commitFingerprint, commits, body: markdown, aiGenerated, reasoningTrace });

  return NextResponse.json({ ok: true });
}
