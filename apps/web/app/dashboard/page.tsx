import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { formatUsageResetDate, getPlanUsageSnapshot, type PlanLimitUsage } from "@/lib/plan-usage";
import { AnchorButton, Card } from "@commitglow/ui";
import { changelogs, commits, integrations, projects, repositories } from "@commitglow/db/schema";
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

function UsageLimitRow({ label, usage, accent = "violet" }: { label: string; usage: PlanLimitUsage; accent?: "violet" | "emerald" }) {
  const barWidth = usage.limit === null ? 100 : percent(usage.used, usage.limit);
  const barClass = accent === "emerald" ? "bg-emerald-300/70 shadow-[0_0_18px_rgba(52,211,153,0.35)]" : "bg-violet-300/70 shadow-[0_0_18px_rgba(196,181,253,0.45)]";

  return (
    <div className="rounded-sm border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">{label}</p>
          <p className="mt-2 font-mono text-lg text-white">{usage.remainingLabel}</p>
        </div>
        <span className="shrink-0 rounded-sm border border-white/10 bg-black/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">{usage.label}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-sm border border-white/10 bg-black/50">
        <div className={`h-full ${barClass}`} style={{ width: `${barWidth}%` }} />
      </div>
      {usage.reached ? <p className="mt-3 font-mono text-[11px] leading-5 text-zinc-600">{usage.hardLimit ? "Limit reached." : "Included allowance used; overage can continue."}</p> : null}
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
  const usage = await getPlanUsageSnapshot(session.user, organization);
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
          <h1 className="mt-4 font-mono text-3xl text-white sm:text-4xl">Your release desk.</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">You are working inside {organization.name}. Create projects, connect repositories, and turn shipped work into clean product updates.</p>
        </div>
        <AnchorButton href="/dashboard/projects" variant="primary">New Project</AnchorButton>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-6">
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Projects</p>
          <p className="mt-4 font-mono text-3xl text-white sm:text-4xl">{projectCount?.value ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Repositories</p>
          <p className="mt-4 font-mono text-3xl text-white sm:text-4xl">{repositoryCount?.value ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Changelogs</p>
          <p className="mt-4 font-mono text-3xl text-white sm:text-4xl">{changelogCount?.value ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Commits</p>
          <p className="mt-4 font-mono text-3xl text-white sm:text-4xl">{commitCount?.value ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Providers</p>
          <p className="mt-4 font-mono text-3xl text-white sm:text-4xl">{providerCount}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Generations</p>
          <p className="mt-4 font-mono text-3xl text-white sm:text-4xl">{usage.generations.used}</p>
        </Card>
      </div>

      <Card className="mt-8 relative overflow-hidden p-0 hover:border-violet-300/30">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/70 to-transparent" />
        <div className="border-b border-white/10 p-5 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Plan Usage</p>
              <h2 className="mt-2 font-mono text-2xl text-white">{usage.planLabel} limits</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Monthly generations reset on {formatUsageResetDate(usage.resetAt)}. Workspace, project, and provider limits update immediately as you create or connect resources.</p>
            </div>
            <AnchorButton href="/dashboard/account" variant="secondary">Account Usage</AnchorButton>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
          <UsageLimitRow label="Generations" usage={usage.generations} accent={usage.generations.overagePriceUsd === null ? "violet" : "emerald"} />
          <UsageLimitRow label="Workspaces" usage={usage.workspaces} />
          <UsageLimitRow label="Projects in this workspace" usage={usage.projects} />
          <UsageLimitRow label="Provider accounts" usage={usage.providerAccounts} />
        </div>
        <div className="grid gap-3 border-t border-white/10 bg-black/20 p-5 sm:grid-cols-2 sm:p-6">
          <div className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">Repositories</p>
            <p className="mt-2 font-mono text-xl text-white">{usage.repositories.label}</p>
          </div>
          <div className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">Changelogs</p>
            <p className="mt-2 font-mono text-xl text-white">{usage.changelogs.label}</p>
          </div>
        </div>
      </Card>

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
