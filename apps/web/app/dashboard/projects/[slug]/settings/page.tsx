import { getProjectContext } from "@/lib/project-context";
import { Card } from "@commitglow/ui";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await getProjectContext(slug);

  if (!context) {
    return null;
  }

  const { organization, project } = context;

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Project Settings</p>
        <h1 className="mt-4 font-mono text-4xl text-white">{project.name}</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">Configure defaults for this project inside {organization.name}.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Identity</p>
          <h2 className="mt-4 font-mono text-lg text-white">Project profile</h2>
          <dl className="mt-5 space-y-4 font-mono text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-zinc-600">Name</dt>
              <dd className="truncate text-zinc-300">{project.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-zinc-600">Slug</dt>
              <dd className="truncate text-zinc-300">/{project.slug}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-zinc-600">Workspace</dt>
              <dd className="truncate text-zinc-300">{organization.name}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Upcoming</p>
          <h2 className="mt-4 font-mono text-lg text-white">Release preferences</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Tone, default branch, output formats, provider routing, and changelog visibility will live here as the generation pipeline lands.</p>
        </Card>
      </div>
    </div>
  );
}
