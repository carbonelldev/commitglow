import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateDefaultOrganization } from "@/lib/organizations";
import { ProjectCreateForm } from "@/components/project-create-form";
import { Card } from "@commitglow/ui";
import { projects } from "@commitglow/db/schema";
import { desc, eq } from "drizzle-orm";
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

  const organization = await getOrCreateDefaultOrganization(session.user);
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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Projects</p>
        <h1 className="mt-4 font-mono text-4xl text-white">Projects</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">Projects live inside {organization.name}. Repositories, changelog history, and generated outputs attach here.</p>
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
                <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{userProjects.length} total</span>
              </div>
              <div className="grid gap-3">
                {userProjects.map((project) => (
                  <article id={`project-${project.slug}`} key={project.id} className="scroll-mt-8 rounded-sm border border-white/10 bg-white/[0.02] p-4 transition hover:border-violet-300/40 target:border-violet-300/60 target:bg-violet-500/10">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-mono text-base text-white">{project.name}</h3>
                        <p className="mt-1 font-mono text-xs text-zinc-500">/{project.slug}</p>
                      </div>
                      <span className="font-mono text-xs text-zinc-600">{formatDate(project.createdAt)}</span>
                    </div>
                    <p className="mt-4 font-mono text-sm leading-7 text-zinc-400">{project.description || "No description yet."}</p>
                    <div className="mt-4 flex gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-600">
                      <span className="rounded-sm border border-white/10 px-2 py-1">Repos 0</span>
                      <span className="rounded-sm border border-white/10 px-2 py-1">Changelogs 0</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-mono text-lg text-white">Create project</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Start with a product or workspace. You can connect repositories in the next phase.</p>
          <ProjectCreateForm />
        </Card>
      </div>
    </div>
  );
}
