"use client";

import { createManualChangelog, type ManualChangelogFormState } from "@/app/dashboard/projects/[slug]/changelogs/actions";
import { Button, Input } from "@commitglow/ui";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

type ManualChangelogFormProps = {
  projectId: string;
  projectSlug: string;
};

const initialState: ManualChangelogFormState = {
  status: "idle",
  message: ""
};

const fields = [
  { name: "added", label: "Added", placeholder: "New settings page\nWebhook event preview" },
  { name: "changed", label: "Changed", placeholder: "Repository attach flow now verifies GitHub access" },
  { name: "fixed", label: "Fixed", placeholder: "Resolved dashboard sidebar active state" },
  { name: "removed", label: "Removed", placeholder: "Deprecated manual branch override" },
  { name: "breaking", label: "Breaking Changes", placeholder: "Renamed API response field from changes to entries" }
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" disabled={pending} className="w-full">
      {pending ? "Creating Draft…" : "Create Manual Draft"}
    </Button>
  );
}

export function ManualChangelogForm({ projectId, projectSlug }: ManualChangelogFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createManualChangelog, initialState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <label htmlFor="manual-changelog-title" className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Title</span>
        <Input id="manual-changelog-title" name="title" placeholder="May 2026 release" required maxLength={120} />
      </label>
      <label htmlFor="manual-changelog-version" className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Version</span>
        <Input id="manual-changelog-version" name="version" placeholder="v0.2.0 optional" maxLength={48} />
      </label>
      {fields.map((field) => (
        <label key={field.name} htmlFor={`manual-changelog-${field.name}`} className="block">
          <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{field.label}</span>
          <textarea id={`manual-changelog-${field.name}`} name={field.name} placeholder={field.placeholder} maxLength={1600} className="min-h-24 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-300/70 focus:ring-2 focus:ring-violet-300/20" />
        </label>
      ))}
      <label htmlFor="manual-changelog-notes" className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Notes</span>
        <textarea id="manual-changelog-notes" name="notes" placeholder="Optional migration notes, rollout details, or validation context." maxLength={1200} className="min-h-20 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-300/70 focus:ring-2 focus:ring-violet-300/20" />
      </label>
      <p className="rounded-sm border border-white/10 bg-black/30 p-3 text-xs leading-5 text-zinc-600">Manual mode only formats supplied release changes into a changelog draft. It is not a general AI prompt surface.</p>
      <SubmitButton />
      <div aria-live="polite" className="min-h-6">
        {state.message ? (
          <p className={state.status === "error" ? "font-mono text-sm text-violet-200" : "font-mono text-sm text-zinc-400"}>
            {state.status === "error" ? "! " : "// "}
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
