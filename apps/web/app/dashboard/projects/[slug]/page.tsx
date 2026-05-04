import { db } from "@/lib/db";
import { formatProjectDate, getProjectContext } from "@/lib/project-context";
import { AnchorButton, Card } from "@commitglow/ui";
import { changelogs, commits, repositories } from "@commitglow/db/schema";
import { count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await getProjectContext(slug);

  if (!context) {
    return null;
  }

  const { organization, project } = context;

  if (!project) {
    notFound();
  }

  const [repositoryCount] = await db.select({ value: count() }).from(repositories).where(eq(repositories.projectId, project.id));
  const [changelogCount] = await db.select({ value: count() }).from(changelogs).where(eq(changelogs.projectId, project.id));
  const [commitCount] = await db.select({ value: count() }).from(commits).innerJoin(repositories, eq(commits.repositoryId, repositories.id)).where(eq(repositories.projectId, project.id));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Project</p>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-mono text-4xl text-white">{project.name}</h1>
            <p className="mt-3 max-w-2xl text-zinc-400">{project.description || `Overview for this project inside ${organization.name}. Use the project sidebar tabs to configure repositories, changelogs, and settings.`}</p>
          </div>
          <AnchorButton href="/dashboard/projects">All Projects</AnchorButton>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-4">
        <Card id="repositories" className="scroll-mt-8">
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
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Created</p>
          <p className="mt-4 font-mono text-xl text-white">{formatProjectDate(project.createdAt)}</p>
        </Card>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card>
          <h2 className="font-mono text-lg text-white">Repositories</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Manage GitHub repositories attached to this project.</p>
          <AnchorButton href={`/dashboard/projects/${project.slug}/repositories`} className="mt-6">Open Repositories</AnchorButton>
        </Card>
        <Card>
          <h2 className="font-mono text-lg text-white">Changelogs</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">View generated changelogs and release-note history.</p>
          <AnchorButton href={`/dashboard/projects/${project.slug}/changelogs`} className="mt-6">Open Changelogs</AnchorButton>
        </Card>
        <Card>
          <h2 className="font-mono text-lg text-white">Settings</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Configure project preferences and future provider settings.</p>
          <AnchorButton href={`/dashboard/projects/${project.slug}/settings`} className="mt-6">Open Settings</AnchorButton>
        </Card>
      </div>
    </div>
  );
}
