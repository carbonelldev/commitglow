import { ConnectGitHubButton } from "@/components/connect-github-button";
import { ManualChangelogForm } from "@/components/manual-changelog-form";
import { db } from "@/lib/db";
import { formatProjectDate, getProjectContext } from "@/lib/project-context";
import { Card } from "@commitglow/ui";
import { changelogs, repositories } from "@commitglow/db/schema";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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

  const projectChangelogs = await db
    .select({
      id: changelogs.id,
      title: changelogs.title,
      version: changelogs.version,
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
        <h1 className="mt-4 font-mono text-4xl text-white">{project.name}</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">Create changelogs from GitHub permissions, verified repository access, or tightly scoped manual change entries.</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Primary</p>
          <h2 className="mt-4 font-mono text-lg text-white">Grant GitHub access</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Preferred path for private repositories and future automated commit sync. Provider account limits are enforced at the workspace level.</p>
          <ConnectGitHubButton callbackURL="/dashboard/providers?connect=github" />
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Fallback</p>
          <h2 className="mt-4 font-mono text-lg text-white">Attach public repository</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Paste owner/repo or a GitHub URL. CommitGlow checks access and stores the real branch and visibility from GitHub.</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Manual</p>
          <h2 className="mt-4 font-mono text-lg text-white">Write current changes</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Structured fields keep manual drafts focused on release notes instead of open-ended AI prompts.</p>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <Card>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-mono text-lg text-white">Changelog history</h2>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{projectChangelogs.length} total</span>
        </div>
        {projectChangelogs.length === 0 ? (
          <div className="rounded-sm border border-dashed border-white/10 p-6">
            <p className="font-mono text-xl text-white">No changelogs yet.</p>
            <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Changelog generation comes after repository commit sync.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {projectChangelogs.map((changelog) => (
              <article key={changelog.id} className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-base text-white">{changelog.title}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      {changelog.repositoryOwner && changelog.repositoryName ? `${changelog.repositoryOwner}/${changelog.repositoryName}` : "project-wide"}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-zinc-600">{formatProjectDate(changelog.publishedAt ?? changelog.createdAt)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-600">
                  <span className="rounded-sm border border-white/10 px-2 py-1">{changelog.version || "unversioned"}</span>
                  <span className="rounded-sm border border-white/10 px-2 py-1">{changelog.publishedAt ? "published" : "draft"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

        <Card>
          <h2 className="font-mono text-lg text-white">Manual changelog draft</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Use this only when there is no repository source. Each line becomes a changelog bullet under a fixed section.</p>
          <ManualChangelogForm projectId={project.id} projectSlug={project.slug} />
        </Card>
      </div>
    </div>
  );
}
