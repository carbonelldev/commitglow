import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { AnchorButton, Card } from "@commitglow/ui";
import { changelogs, commits, integrations, projects, repositories, usageEvents } from "@commitglow/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function percent(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.max(4, Math.round((value / total) * 100));
}

function MetricBar({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-[0.14em]">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-300">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm border border-white/10 bg-black/40">
        <div className="h-full bg-violet-300/70 shadow-[0_0_18px_rgba(196,181,253,0.45)]" style={{ width: `${percent(value, total)}%` }} />
      </div>
    </div>
  );
}

function isExplicitProviderConnection(metadata: unknown) {
  return Boolean(metadata && typeof metadata === "object" && (metadata as Record<string, unknown>).source === "explicit-provider-connect");
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [projectCount] = await db.select({ value: count() }).from(projects).where(eq(projects.organizationId, organization.id));
  const [repositoryCount] = await db
    .select({ value: count() })
    .from(repositories)
    .innerJoin(projects, eq(repositories.projectId, projects.id))
    .where(eq(projects.organizationId, organization.id));
  const [privateRepositoryCount] = await db
    .select({ value: count() })
    .from(repositories)
    .innerJoin(projects, eq(repositories.projectId, projects.id))
    .where(and(eq(projects.organizationId, organization.id), eq(repositories.isPrivate, true)));
  const [changelogCount] = await db
    .select({ value: count() })
    .from(changelogs)
    .innerJoin(projects, eq(changelogs.projectId, projects.id))
    .where(eq(projects.organizationId, organization.id));
  const [commitCount] = await db
    .select({ value: count() })
    .from(commits)
    .innerJoin(repositories, eq(commits.repositoryId, repositories.id))
    .innerJoin(projects, eq(repositories.projectId, projects.id))
    .where(eq(projects.organizationId, organization.id));
  const workspaceProviders = await db.select({ metadata: integrations.metadata }).from(integrations).where(eq(integrations.organizationId, organization.id));
  const [generationCount] = await db.select({ value: count() }).from(usageEvents).where(and(eq(usageEvents.organizationId, organization.id), eq(usageEvents.type, "generation")));
  const recentProjects = await db
    .select({ id: projects.id, name: projects.name, slug: projects.slug, createdAt: projects.createdAt })
    .from(projects)
    .where(eq(projects.organizationId, organization.id))
    .orderBy(desc(projects.createdAt))
    .limit(3);
  const recentChangelogs = await db
    .select({ id: changelogs.id, title: changelogs.title, version: changelogs.version, createdAt: changelogs.createdAt, projectName: projects.name, projectSlug: projects.slug })
    .from(changelogs)
    .innerJoin(projects, eq(changelogs.projectId, projects.id))
    .where(eq(projects.organizationId, organization.id))
    .orderBy(desc(changelogs.createdAt))
    .limit(3);
  const totalRepositories = repositoryCount?.value ?? 0;
  const privateRepositories = privateRepositoryCount?.value ?? 0;
  const publicRepositories = Math.max(0, totalRepositories - privateRepositories);
  const providerCount = workspaceProviders.filter((provider) => isExplicitProviderConnection(provider.metadata)).length;
  const activityTotal = Math.max(projectCount?.value ?? 0, totalRepositories, changelogCount?.value ?? 0, providerCount, 1);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Dashboard</p>
          <h1 className="mt-4 font-mono text-4xl text-white">Your release desk.</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">You are working inside {organization.name}. Create projects, connect repositories, and turn shipped work into clean product updates.</p>
        </div>
        <AnchorButton href="/dashboard/projects" variant="primary">New Project</AnchorButton>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-3 xl:grid-cols-6">
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Projects</p>
          <p className="mt-4 font-mono text-4xl text-white">{projectCount?.value ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Repositories</p>
          <p className="mt-4 font-mono text-4xl text-white">{repositoryCount?.value ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Changelogs</p>
          <p className="mt-4 font-mono text-4xl text-white">{changelogCount?.value ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Commits</p>
          <p className="mt-4 font-mono text-4xl text-white">{commitCount?.value ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Providers</p>
          <p className="mt-4 font-mono text-4xl text-white">{providerCount}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Generations</p>
          <p className="mt-4 font-mono text-4xl text-white">{generationCount?.value ?? 0}</p>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <Card>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="font-mono text-lg text-white">Workspace activity</h2>
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">live metrics</span>
          </div>
          <div className="space-y-5">
            <MetricBar label="Projects" value={projectCount?.value ?? 0} total={activityTotal} />
            <MetricBar label="Repositories" value={totalRepositories} total={activityTotal} />
            <MetricBar label="Changelogs" value={changelogCount?.value ?? 0} total={activityTotal} />
            <MetricBar label="Providers" value={providerCount} total={activityTotal} />
          </div>
        </Card>

        <Card>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="font-mono text-lg text-white">Repository visibility</h2>
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{totalRepositories} total</span>
          </div>
          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="rounded-sm border border-white/10 bg-black/30 p-4">
              <p className="text-3xl text-white">{publicRepositories}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-600">public</p>
            </div>
            <div className="rounded-sm border border-white/10 bg-black/30 p-4">
              <p className="text-3xl text-white">{privateRepositories}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-600">private</p>
            </div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-sm border border-white/10 bg-black/40">
            <div className="h-full bg-zinc-300/70" style={{ width: `${percent(publicRepositories, totalRepositories)}%` }} />
          </div>
          <p className="mt-4 font-mono text-xs leading-5 text-zinc-600">Private repositories require a workspace-scoped provider connection.</p>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          {recentProjects.length === 0 ? (
            <div className="text-center">
              <p className="font-mono text-2xl text-white">No projects yet.</p>
              <p className="mx-auto mt-3 max-w-xl font-mono text-sm leading-7 text-zinc-400">Create a project first. Then connect repositories or paste commits to generate your first changelog.</p>
              <AnchorButton href="/dashboard/projects" className="mt-6">New Project</AnchorButton>
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="font-mono text-lg text-white">Recent projects</h2>
                <a href="/dashboard/projects" className="font-mono text-xs uppercase tracking-[0.14em] text-violet-200 transition hover:text-white">View all -&gt;</a>
              </div>
              <div className="grid gap-3">
                {recentProjects.map((project) => (
                  <a key={project.id} href={`/dashboard/projects/${project.slug}`} className="block rounded-sm border border-white/10 bg-white/[0.02] p-4 transition hover:border-violet-300/40">
                    <p className="font-mono text-base text-white">{project.name}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">/{project.slug}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card>
          {recentChangelogs.length === 0 ? (
            <div className="text-center">
              <p className="font-mono text-2xl text-white">No changelogs yet.</p>
              <p className="mx-auto mt-3 max-w-xl font-mono text-sm leading-7 text-zinc-400">Create one from a project using GitHub access, a verified repository, or manual change entries.</p>
              <AnchorButton href="/dashboard/projects" className="mt-6">Open Projects</AnchorButton>
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="font-mono text-lg text-white">Recent changelogs</h2>
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">latest</span>
              </div>
              <div className="grid gap-3">
                {recentChangelogs.map((changelog) => (
                  <a key={changelog.id} href={`/dashboard/projects/${changelog.projectSlug}/changelogs`} className="block rounded-sm border border-white/10 bg-white/[0.02] p-4 transition hover:border-violet-300/40">
                    <p className="font-mono text-base text-white">{changelog.title}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">{changelog.projectName}{changelog.version ? ` / ${changelog.version}` : ""}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
