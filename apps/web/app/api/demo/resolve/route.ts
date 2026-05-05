import { getDemoCacheKey, readDemoCache, resolvePublicDemo } from "@/lib/public-demo";
import { NextResponse } from "next/server";

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
  const { cacheKey } = await getDemoCacheKey({ repository, commits });
  const cached = await readDemoCache(cacheKey);

  return NextResponse.json({
    provider: repository.provider,
    repo: `${repository.owner}/${repository.name}`,
    repoUrl: repository.url,
    description: repository.description,
    defaultBranch: repository.defaultBranch,
    commits,
    cached: Boolean(cached),
    body: cached?.body ?? "",
    aiGenerated: cached?.aiGenerated ?? false,
    reasoningTrace: cached?.reasoningTrace ?? "",
  });
}
