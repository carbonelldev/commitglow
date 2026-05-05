import { ConnectGitHubButton } from "@/components/connect-github-button";
import { ChangelogShareActions } from "@/components/changelog-share-actions";
import { ManualChangelogForm } from "@/components/manual-changelog-form";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";
import { formatProjectDate, getProjectContext } from "@/lib/project-context";
import { AnchorButton, Card } from "@commitglow/ui";
import { changelogs, repositories } from "@commitglow/db/schema";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function getChangelogSummary(body: string) {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"));

  const bullets = lines
    .map((line) => line.replace(/^([-*]|\d+\.)\s+/, ""))
    .filter((line) => line.length > 0)
    .slice(0, 3);

  if (bullets.length > 0) {
    return bullets;
  }

  const fallback = body.trim().replace(/\s+/g, " ");

  return fallback ? [fallback.slice(0, 180)] : ["No changelog details were recorded."];
}

export default async function ProjectChangelogsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await getProjectContext(slug);

  if (!context) {
    return null;
  }

  const { project } = context;

  if (!project) {
    notFound();
  }

  const pageUrl = `${getSiteUrl()}/dashboard/projects/${project.slug}/changelogs`;

  const projectChangelogs = await db
    .select({
      id: changelogs.id,
      title: changelogs.title,
      version: changelogs.version,
      body: changelogs.body,
      publishedAt: changelogs.publishedAt,
      createdAt: changelogs.createdAt,
      repositoryOwner: repositories.owner,
      repositoryName: repositories.name
    })
    .from(changelogs)
    .leftJoin(repositories, eq(changelogs.repositoryId, repositories.id))
    .where(eq(changelogs.projectId, project.id))
    .orderBy(desc(changelogs.createdAt));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Project Changelogs</p>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-mono text-3xl text-white sm:text-4xl">{project.name}</h1>
            <p className="mt-3 max-w-2xl text-zinc-400">Changelog history for this project. Generate new changelogs from each repository's detail page.</p>
          </div>
          <AnchorButton href={`/dashboard/projects/${project.slug}/repositories`}>Open Repositories</AnchorButton>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-mono text-lg text-white">Changelog history</h2>
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{projectChangelogs.length} total</span>
          </div>
          {projectChangelogs.length === 0 ? (
            <div className="rounded-sm border border-dashed border-white/10 p-6">
              <p className="font-mono text-xl text-white">No changelogs yet.</p>
              <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Open a repository to generate a changelog from its synced commits, or write a manual draft.</p>
              <AnchorButton href={`/dashboard/projects/${project.slug}/repositories`} className="mt-6">Open Repositories</AnchorButton>
            </div>
          ) : (
            <div className="grid gap-4">
              {projectChangelogs.map((changelog, index) => {
                const source = changelog.repositoryOwner && changelog.repositoryName ? `${changelog.repositoryOwner}/${changelog.repositoryName}` : "project-wide";
                const date = formatProjectDate(changelog.publishedAt ?? changelog.createdAt);
                const summary = getChangelogSummary(changelog.body);

                return (
                  <article key={changelog.id} className="group relative overflow-hidden rounded-md border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_34%),rgba(255,255,255,0.018)] p-5 transition duration-200 hover:border-violet-300/45 hover:bg-white/[0.03]">
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-violet-200/70 via-violet-400/20 to-transparent" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200/80">#{String(index + 1).padStart(2, "0")}</span>
                          <span className="h-px w-8 bg-white/10" />
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">{date}</span>
                        </div>
                        <h3 className="mt-3 font-mono text-lg leading-7 text-white">{changelog.title}</h3>
                        <p className="mt-1 truncate font-mono text-xs text-zinc-500">{source}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                        <span className="rounded-sm border border-white/10 bg-black/20 px-2.5 py-1.5">{changelog.version || "unversioned"}</span>
                        <span className={changelog.publishedAt ? "rounded-sm border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1.5 text-emerald-200/80" : "rounded-sm border border-violet-300/20 bg-violet-500/10 px-2.5 py-1.5 text-violet-100/80"}>
                          {changelog.publishedAt ? "published" : "draft"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-sm border border-white/10 bg-black/25 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">Summary</p>
                      <ul className="mt-3 space-y-2">
                        {summary.map((item, summaryIndex) => (
                          <li key={`${summaryIndex}-${item}`} className="flex gap-3 font-mono text-xs leading-6 text-zinc-400">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-200/70" />
                            <span className="line-clamp-2">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <details className="group/details mt-4 rounded-sm border border-white/10 bg-black/20 transition open:border-violet-300/30 open:bg-violet-500/[0.04]">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:text-white [&::-webkit-details-marker]:hidden">
                        <span className="group-open/details:hidden">View full changelog</span>
                        <span className="hidden group-open/details:inline">Hide full changelog</span>
                        <span className="text-violet-200 transition group-open/details:rotate-45">+</span>
                      </summary>
                      <div className="border-t border-white/10 p-4">
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-zinc-400">{changelog.body}</pre>
                      </div>
                    </details>

                    <ChangelogShareActions
                      title={changelog.title}
                      version={changelog.version}
                      body={changelog.body}
                      source={source}
                      url={pageUrl}
                      className="mt-4"
                      compact
                    />
                  </article>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-mono text-lg text-white">Manual changelog draft</h2>
            <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Use this only when there is no repository source. Each line becomes a changelog bullet under a fixed section.</p>
            <ManualChangelogForm projectId={project.id} projectSlug={project.slug} />
          </Card>

          <Card>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Connection</p>
            <h2 className="mt-4 font-mono text-lg text-white">GitHub repository access</h2>
            <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Connect GitHub to this workspace to enable private repository changelog generation.</p>
            <ConnectGitHubButton callbackURL="/dashboard/providers?connect=github" />
          </Card>
        </div>
      </div>
    </div>
  );
}
