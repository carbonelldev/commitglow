import { RepositoryAttachForm } from "@/components/repository-attach-form";
import { db } from "@/lib/db";
import { formatProjectDate, getProjectContext } from "@/lib/project-context";
import { Card } from "@commitglow/ui";
import { repositories } from "@commitglow/db/schema";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

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
      createdAt: repositories.createdAt
    })
    .from(repositories)
    .where(eq(repositories.projectId, project.id))
    .orderBy(asc(repositories.owner), asc(repositories.name));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Project Repositories</p>
        <h1 className="mt-4 font-mono text-4xl text-white">{project.name}</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">Attach and review the GitHub repositories that feed this project's future changelogs.</p>
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
              <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Attach a public GitHub repository to start preparing commit sync.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {projectRepositories.map((repository) => (
                <a key={repository.id} href={repository.url} target="_blank" rel="noreferrer" className="group rounded-sm border border-white/10 bg-white/[0.02] p-4 transition hover:border-violet-300/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-base text-white group-hover:text-violet-200">{repository.owner}/{repository.name}</p>
                      <p className="mt-1 font-mono text-xs text-zinc-500">{repository.url}</p>
                    </div>
                    <span className="font-mono text-xs text-zinc-600">{formatProjectDate(repository.createdAt)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-600">
                    <span className="rounded-sm border border-white/10 px-2 py-1">{repository.provider}</span>
                    <span className="rounded-sm border border-white/10 px-2 py-1">branch {repository.defaultBranch}</span>
                    <span className="rounded-sm border border-white/10 px-2 py-1">{repository.isPrivate ? "private" : "public"}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-mono text-lg text-white">Attach repository</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Attach a public GitHub repository directly to {project.name}.</p>
          <RepositoryAttachForm projects={[{ id: project.id, name: project.name }]} fixedProjectId={project.id} fixedProjectName={project.name} />
        </Card>
      </div>
    </div>
  );
}
