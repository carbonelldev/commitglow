import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateDefaultOrganization } from "@/lib/organizations";
import { AnchorButton, Card } from "@commitglow/ui";
import { projects } from "@commitglow/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  const organization = await getOrCreateDefaultOrganization(session.user);
  const [projectCount] = await db.select({ value: count() }).from(projects).where(eq(projects.organizationId, organization.id));
  const recentProjects = await db
    .select({ id: projects.id, name: projects.name, slug: projects.slug, createdAt: projects.createdAt })
    .from(projects)
    .where(eq(projects.organizationId, organization.id))
    .orderBy(desc(projects.createdAt))
    .limit(3);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Dashboard</p>
          <h1 className="mt-4 font-mono text-4xl text-white">Your release desk.</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">Create projects in {organization.name}, connect repositories, and turn shipped work into clean product updates.</p>
        </div>
        <AnchorButton href="/dashboard/projects" variant="primary">New Project</AnchorButton>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Projects</p>
          <p className="mt-4 font-mono text-4xl text-white">{projectCount?.value ?? 0}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Repositories</p>
          <p className="mt-4 font-mono text-4xl text-white">0</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Changelogs</p>
          <p className="mt-4 font-mono text-4xl text-white">0</p>
        </Card>
      </div>
      <Card className="mt-8">
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
                <div key={project.id} className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
                  <p className="font-mono text-base text-white">{project.name}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-500">/{project.slug}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
