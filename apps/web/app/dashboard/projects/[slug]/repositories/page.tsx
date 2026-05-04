import { RepositoryAttachForm } from "@/components/repository-attach-form";
import { SyncRepositoryButton } from "@/components/sync-repository-button";
import { db } from "@/lib/db";
import { formatProjectDate, getProjectContext } from "@/lib/project-context";
import { AnchorButton, Card } from "@commitglow/ui";
import { commits, repositories } from "@commitglow/db/schema";
import { asc, count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

const providerIcons: Record<string, ReactElement> = {
  github: (
    <svg aria-hidden="true" className="h-3.5 w-3.5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ),
  gitlab: (
    <svg aria-hidden="true" className="h-3.5 w-3.5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 23.999L15.534 13.134H8.466L12 23.999zM2.996 13.134L0 13.134 3.93 16.119 2.996 13.134zM24 13.134L21.004 13.134 20.07 16.119 24 13.134zM5.541 9.003L8.466 13.134 3.93 16.119 5.541 9.003zM18.459 9.003L20.07 16.119 15.534 13.134 18.459 9.003zM8.466 13.134L12 1.536 15.534 13.134 8.466 13.134z" />
    </svg>
  ),
  gitea: (
    <svg aria-hidden="true" className="h-3.5 w-3.5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" opacity="0.2" />
      <path d="M12 4C7.58 4 4 7.58 4 12c0 3.53 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0020 12c0-4.42-3.58-8-8-8z" />
    </svg>
  )
};

function ProviderBadge({ provider, url }: { provider: string; url: string }) {
  const icon = providerIcons[provider] ?? null;

  return (
    <span className="group/provider relative inline-flex items-center gap-1.5 rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-violet-300/40">
      {icon}
      {provider}
      <span className="pointer-events-none absolute -top-1 left-1/2 z-50 hidden -translate-x-1/2 -translate-y-full rounded-sm border border-violet-300/30 bg-[#050507]/98 px-3 py-2 font-mono text-[10px] leading-relaxed text-zinc-400 shadow-[0_12px_48px_rgba(0,0,0,0.5)] opacity-0 transition group-hover/provider:block group-hover/provider:opacity-100">
        {url}
      </span>
    </span>
  );
}

export const dynamic = "force-dynamic";

export default async function ProjectRepositoriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await getProjectContext(slug);

  if (!context) {
    return null;
  }

  const { project } = context;

  if (!project) {
    notFound();
  }

  const projectRepositories = await db
    .select({
      id: repositories.id,
      provider: repositories.provider,
      owner: repositories.owner,
      name: repositories.name,
      url: repositories.url,
      defaultBranch: repositories.defaultBranch,
      isPrivate: repositories.isPrivate,
      createdAt: repositories.createdAt,
      updatedAt: repositories.updatedAt
    })
    .from(repositories)
    .where(eq(repositories.projectId, project.id))
    .orderBy(asc(repositories.owner), asc(repositories.name));

  const commitCounts = projectRepositories.length > 0
    ? await Promise.all(
        projectRepositories.map(async (repository) => {
          const [result] = await db
            .select({ value: count() })
            .from(commits)
            .where(eq(commits.repositoryId, repository.id));

          return { repositoryId: repository.id, value: result?.value ?? 0 };
        })
      )
    : [];

  const commitCountMap = new Map(commitCounts.map((item) => [item.repositoryId, item.value]));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Project Repositories</p>
        <h1 className="mt-4 font-mono text-3xl text-white sm:text-4xl">{project.name}</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">Attach repositories and sync commits to prepare for changelog generation.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-mono text-lg text-white">Attached repositories</h2>
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{projectRepositories.length} total</span>
          </div>
          {projectRepositories.length === 0 ? (
            <div className="rounded-sm border border-dashed border-white/10 p-6">
              <p className="font-mono text-xl text-white">No repositories attached.</p>
              <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Attach a GitHub, GitLab, Bitbucket, or Gitea repository and sync commits to prepare changelogs.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {projectRepositories.map((repository) => {
                const commitCount = commitCountMap.get(repository.id) ?? 0;

                return (
                  <article key={repository.id} className="rounded-sm border border-white/10 bg-white/[0.02] p-4 transition hover:border-violet-300/40">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <a
                          href={`/dashboard/projects/${project.slug}/repositories/${repository.id}`}
                          className="break-all font-mono text-base text-white transition hover:text-violet-200 sm:break-normal"
                        >
                          {repository.owner}/{repository.name}
                        </a>
                        <p className="mt-1 break-all font-mono text-xs text-zinc-500">{repository.url}</p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-zinc-600">{formatProjectDate(repository.createdAt)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-600">
                      <ProviderBadge provider={repository.provider} url={repository.url} />
                      <span className="rounded-sm border border-white/10 px-2 py-1">branch {repository.defaultBranch}</span>
                      <span className="rounded-sm border border-white/10 px-2 py-1">{repository.isPrivate ? "private" : "public"}</span>
                      <span className="rounded-sm border border-violet-300/20 bg-violet-500/10 px-2 py-1 text-violet-100">{commitCount} commit{commitCount === 1 ? "" : "s"}</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-700">
                          Last synced {formatProjectDate(repository.updatedAt)}
                        </span>
                        <AnchorButton
                          href={`/dashboard/projects/${project.slug}/repositories/${repository.id}`}
                          className="px-2 py-1 text-[10px]"
                          variant="ghost"
                        >
                          View commits &rarr;
                        </AnchorButton>
                      </div>
                      <SyncRepositoryButton repositoryId={repository.id} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-mono text-lg text-white">Attach repository</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Search connected GitHub accounts or paste a public GitLab, Bitbucket, or Gitea repository URL.</p>
          <RepositoryAttachForm projects={[{ id: project.id, name: project.name }]} fixedProjectId={project.id} fixedProjectName={project.name} />
        </Card>
      </div>
    </div>
  );
}
