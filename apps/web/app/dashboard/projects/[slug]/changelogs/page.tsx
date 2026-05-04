import { ConnectGitHubButton } from "@/components/connect-github-button";
import { ManualChangelogForm } from "@/components/manual-changelog-form";
import { db } from "@/lib/db";
import { formatProjectDate, getProjectContext } from "@/lib/project-context";
import { AnchorButton, Card } from "@commitglow/ui";
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
            <h1 className="font-mono text-4xl text-white">{project.name}</h1>
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
            <div className="grid gap-3">
              {projectChangelogs.map((changelog) => (
                <article key={changelog.id} className="rounded-sm border border-white/10 bg-white/[0.02] p-4 transition hover:border-violet-300/40">
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
                  <div className="mt-4 rounded-sm border border-white/10 bg-black/30 p-3">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-zinc-500 line-clamp-6">{changelog.body}</pre>
                  </div>
                </article>
              ))}
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
