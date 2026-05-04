"use client";

import { generateChangelogPreview, saveGeneratedChangelog, type GenerateChangelogPreviewState, type ManualChangelogFormState } from "@/app/dashboard/projects/[slug]/changelogs/actions";
import { Button, Input } from "@commitglow/ui";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type GenerateChangelogFormProps = {
  projectId: string;
  projectSlug: string;
  repositories: Array<{
    id: string;
    owner: string;
    name: string;
    defaultBranch: string;
    commitCount: number;
  }>;
  preSelectedRepositoryId?: string;
  selectedShas?: string[];
};

const emptyPreview: GenerateChangelogPreviewState = {
  status: "idle",
  message: "",
  title: "",
  version: "",
  body: "",
  commitCount: 0
};

const saveInitialState: ManualChangelogFormState = {
  status: "idle",
  message: ""
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" disabled={pending} className="w-full">
      {pending ? "Saving Draft..." : "Save Generated Draft"}
    </Button>
  );
}

export function GenerateChangelogForm({ projectId, projectSlug, repositories, preSelectedRepositoryId, selectedShas }: GenerateChangelogFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(saveGeneratedChangelog, saveInitialState);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [preview, setPreview] = useState<GenerateChangelogPreviewState>(emptyPreview);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [body, setBody] = useState("");

  const reposWithCommits = repositories.filter((repository) => repository.commitCount > 0);

  useEffect(() => {
    if (preSelectedRepositoryId && reposWithCommits.some((r) => r.id === preSelectedRepositoryId)) {
      if (selectedShas && selectedShas.length > 0) {
        generateForShas(preSelectedRepositoryId, selectedShas);
      } else {
        generate(preSelectedRepositoryId);
      }
    }
  }, [preSelectedRepositoryId]);

  function generate(repositoryId: string) {
    generateForShas(repositoryId, []);
  }

  function generateForShas(repositoryId: string, shas: string[]) {
    setSelectedRepositoryId(repositoryId);
    setGenerating(true);
    setPreview(emptyPreview);

    startTransition(async () => {
      const result = await generateChangelogPreview(projectId, repositoryId, undefined, shas.length > 0 ? shas : undefined);
      setGenerating(false);
      setPreview(result);

      if (result.status === "success") {
        setTitle(result.title);
        setVersion(result.version);
        setBody(result.body);
      }
    });
  }

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setSelectedRepositoryId("");
      setPreview(emptyPreview);
      setTitle("");
      setVersion("");
      setBody("");
    }
  }, [state.status]);

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Synced repository</span>
        <select
          value={selectedRepositoryId}
          onChange={(event) => generate(event.target.value)}
          disabled={generating || reposWithCommits.length === 0}
          className="w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-violet-300/70 focus:ring-2 focus:ring-violet-300/20 disabled:opacity-50"
        >
          <option value="">Select repository</option>
          {reposWithCommits.map((repository) => (
            <option key={repository.id} value={repository.id}>
              {repository.owner}/{repository.name} ({repository.commitCount} commit{repository.commitCount === 1 ? "" : "s"}, branch {repository.defaultBranch})
            </option>
          ))}
        </select>
      </label>

      {reposWithCommits.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/10 p-4">
          <p className="font-mono text-sm text-zinc-500">No repositories have synced commits yet. Attach a repository and sync its commits first.</p>
        </div>
      ) : null}

      {generating ? (
        <p className="font-mono text-sm text-zinc-400">// Generating changelog preview...</p>
      ) : null}

      {preview.status === "error" && preview.message ? (
        <p className="font-mono text-sm text-violet-200">! {preview.message}</p>
      ) : null}

      {preview.status === "success" && preview.body ? (
        <>
          <div className="flex items-center gap-2 rounded-sm border border-violet-300/20 bg-violet-500/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-violet-100">
            {preview.commitCount} commits from the last sync
          </div>

          <div className="rounded-sm border border-white/10 bg-black/30 p-4 max-h-80 overflow-y-auto scrollbar-soft">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-zinc-300">{preview.body}</pre>
          </div>

          <form ref={formRef} action={formAction} className="space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="repositoryId" value={selectedRepositoryId} />
            <input type="hidden" name="body" value={body} />
            <input type="hidden" name="selectedCommits" value={(selectedShas ?? []).join(",")} />

            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Title</span>
              <Input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
            </label>

            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Version</span>
              <Input name="version" value={version} onChange={(event) => setVersion(event.target.value)} maxLength={48} />
            </label>

            <SaveButton />
          </form>
        </>
      ) : null}

      <div aria-live="polite" className="min-h-6">
        {state.message ? (
          <p className={state.status === "error" ? "font-mono text-sm text-violet-200" : "font-mono text-sm text-zinc-400"}>
            {state.status === "error" ? "! " : "// "}
            {state.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
