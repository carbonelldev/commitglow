import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { formatProjectLimit, getProjectLimit, toPlanSlug } from "@/lib/plans";
import { ProjectCreateForm } from "@/components/project-create-form";
import { RepositoryAttachForm } from "@/components/repository-attach-form";
import { Card } from "@commitglow/ui";
import { projects, repositories } from "@commitglow/db/schema";
import { asc, count, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export default async function ProjectsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const accountPlan = toPlanSlug(session.user.plan);
  const projectLimit = getProjectLimit(accountPlan);
  const projectLimitLabel = formatProjectLimit(accountPlan);
  const [workspaceProjectCount] = await db.select({ value: count() }).from(projects).where(eq(projects.organizationId, organization.id));
  const reachedProjectLimit = projectLimit !== null && (workspaceProjectCount?.value ?? 0) >= projectLimit;
  const userProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      createdAt: projects.createdAt
    })
    .from(projects)
    .where(eq(projects.organizationId, organization.id))
    .orderBy(desc(projects.createdAt));
  const projectRepositories = await db
    .select({
      id: repositories.id,
      projectId: repositories.projectId,
      provider: repositories.provider,
      owner: repositories.owner,
      name: repositories.name,
      url: repositories.url,
      defaultBranch: repositories.defaultBranch
    })
    .from(repositories)
    .innerJoin(projects, eq(repositories.projectId, projects.id))
    .where(eq(projects.organizationId, organization.id))
    .orderBy(asc(repositories.owner), asc(repositories.name));
  const repositoriesByProject = projectRepositories.reduce<Record<string, typeof projectRepositories>>((acc, repository) => {
    acc[repository.projectId] = [...(acc[repository.projectId] ?? []), repository];
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Projects</p>
        <h1 className="mt-4 font-mono text-4xl text-white">Projects</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">Projects live inside the active workspace: {organization.name}. Your {accountPlan} plan can create {projectLimitLabel.toLowerCase()} projects per workspace.</p>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="min-h-72">
          {userProjects.length === 0 ? (
            <div className="flex h-full flex-col justify-center">
              <p className="font-mono text-2xl text-white">No projects yet.</p>
              <p className="mt-3 font-mono text-sm leading-7 text-zinc-400">Create a project first. Repositories, pasted commits, and generated changelogs will attach to it later.</p>
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="font-mono text-lg text-white">Your projects</h2>
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{workspaceProjectCount?.value ?? 0}/{projectLimitLabel} workspace</span>
              </div>
              <div className="grid gap-3">
                {userProjects.map((project) => {
                  const attachedRepositories = repositoriesByProject[project.id] ?? [];

                  return (
                  <article id={`project-${project.slug}`} key={project.id} className="scroll-mt-8 rounded-sm border border-white/10 bg-white/[0.02] p-4 transition hover:border-violet-300/40 target:border-violet-300/60 target:bg-violet-500/10">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <a href={`/dashboard/projects/${project.slug}`} className="font-mono text-base text-white transition hover:text-violet-200">{project.name}</a>
                        <p className="mt-1 font-mono text-xs text-zinc-500">/{project.slug}</p>
                      </div>
                      <span className="font-mono text-xs text-zinc-600">{formatDate(project.createdAt)}</span>
                    </div>
                    <p className="mt-4 font-mono text-sm leading-7 text-zinc-400">{project.description || "No description yet."}</p>
                    <a href={`/dashboard/projects/${project.slug}`} className="mt-4 inline-flex font-mono text-xs uppercase tracking-[0.14em] text-violet-200 transition hover:text-white">Open project -&gt;</a>
                    <div className="mt-4 flex gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-600">
                      <span className="rounded-sm border border-white/10 px-2 py-1">Repos {attachedRepositories.length}</span>
                      <span className="rounded-sm border border-white/10 px-2 py-1">Changelogs 0</span>
                    </div>
                    {attachedRepositories.length > 0 ? (
                      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                        {attachedRepositories.map((repository) => (
                          <a key={repository.id} href={repository.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs transition hover:border-violet-300/40 hover:text-white">
                            <span className="truncate text-zinc-300 group-hover:text-white">{repository.owner}/{repository.name}</span>
                            <span className="shrink-0 uppercase tracking-[0.14em] text-zinc-600">{repository.provider} / {repository.defaultBranch}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </article>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-mono text-lg text-white">Create project</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Start with a product or workspace. Repositories attach to projects.</p>
          {reachedProjectLimit ? <p className="mt-4 rounded-sm border border-violet-300/30 bg-violet-500/10 p-3 font-mono text-sm text-violet-100">Project limit reached for this {accountPlan} workspace. Upgrade to create more.</p> : null}
          <ProjectCreateForm disabled={reachedProjectLimit} />
        </Card>
        <Card className="lg:col-start-2">
          <h2 className="font-mono text-lg text-white">Attach repository</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Paste a public GitHub repository URL. Private repo and provider account support comes later.</p>
          <RepositoryAttachForm projects={userProjects.map((project) => ({ id: project.id, name: project.name }))} />
        </Card>
      </div>
    </div>
  );
}
