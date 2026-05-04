"use client";

import { Button, Input, Select } from "@commitglow/ui";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { attachRepository, getGitHubBranches, searchGitHubRepositories, type GitHubRepositorySearchResult, type RepositoryFormState } from "@/app/dashboard/repositories/actions";

type RepositoryAttachFormProps = {
  projects: Array<{
    id: string;
    name: string;
  }>;
  fixedProjectId?: string;
  fixedProjectName?: string;
};

const initialState: RepositoryFormState = {
  status: "idle",
  message: ""
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" disabled={pending || disabled} className="w-full">
      {pending ? "Attaching..." : "Attach Repository"}
    </Button>
  );
}

export function RepositoryAttachForm({ projects, fixedProjectId, fixedProjectName }: RepositoryAttachFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(attachRepository, initialState);
  const [query, setQuery] = useState("");
  const [repositories, setRepositories] = useState<GitHubRepositorySearchResult[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<GitHubRepositorySearchResult | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupPending, setLookupPending] = useState(false);
  const disabled = !fixedProjectId && projects.length === 0;

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setQuery("");
      setRepositories([]);
      setSelectedRepository(null);
      setBranches([]);
      setSelectedBranch("");
    }
  }, [state.status]);

  function searchRepositories() {
    setLookupPending(true);
    setLookupMessage("");

    startTransition(async () => {
      const result = await searchGitHubRepositories(query);
      setLookupPending(false);

      if (result.status === "error") {
        setLookupMessage(result.message);
        setRepositories([]);
        return;
      }

      setRepositories(result.repositories);
      setLookupMessage(result.repositories.length === 0 ? "No repositories matched that search." : "");
    });
  }

  function selectRepository(repository: GitHubRepositorySearchResult) {
    setSelectedRepository(repository);
    setSelectedBranch(repository.defaultBranch);
    setBranches([repository.defaultBranch]);
    setLookupPending(true);
    setLookupMessage("");

    startTransition(async () => {
      const result = await getGitHubBranches(repository.provider, repository.owner, repository.name, repository.url);
      setLookupPending(false);

      if (result.status === "error") {
        setLookupMessage(result.message);
        return;
      }

      setBranches(result.branches);
      setSelectedBranch(result.branches.includes(repository.defaultBranch) ? repository.defaultBranch : result.branches[0] ?? repository.defaultBranch);
    });
  }

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-4">
      {fixedProjectId ? (
        <input type="hidden" name="projectId" value={fixedProjectId} />
      ) : (
        <label className="block">
          <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Project</span>
          <Select
            name="projectId"
            required
            disabled={disabled}
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </Select>
        </label>
      )}
      {fixedProjectName ? <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-600">Project: {fixedProjectName}</p> : null}
      <div className="rounded-sm border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="block min-w-0 flex-1">
            <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Search connected providers</span>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all connected Git accounts" disabled={disabled || lookupPending} />
          </label>
          <div className="flex items-end">
            <Button type="button" onClick={searchRepositories} disabled={disabled || lookupPending} className="w-full sm:w-auto">
              {lookupPending ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        {repositories.length > 0 ? (
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1 scrollbar-soft">
            {repositories.map((repository) => {
              const active = selectedRepository?.fullName === repository.fullName;

              return (
                <button
                  key={repository.fullName}
                  type="button"
                  onClick={() => selectRepository(repository)}
                  className={[
                    "w-full rounded-sm border p-3 text-left transition",
                    active ? "border-violet-300/50 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:border-violet-300/40"
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-white">{repository.fullName}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{repository.description || "No description"}</p>
                    </div>
                    <span className="shrink-0 rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">{repository.provider}</span>
                    <span className="shrink-0 rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">{repository.isPrivate ? "private" : "public"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {lookupMessage ? <p className="mt-3 font-mono text-sm text-violet-200">! {lookupMessage}</p> : null}
      </div>

      {selectedRepository ? (
        <div className="rounded-sm border border-violet-300/20 bg-violet-500/[0.06] p-4">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-violet-200">Selected repository</p>
          <p className="mt-2 font-mono text-base text-white">{selectedRepository.fullName}</p>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{selectedRepository.provider}</p>
          <label className="mt-4 block">
            <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Branch</span>
            <Select name="selectedBranch" value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
              {branches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </Select>
          </label>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Repository URL</span>
        {selectedRepository ? <input type="hidden" name="repositoryUrl" value={selectedRepository.url} /> : null}
        <Input name={selectedRepository ? undefined : "repositoryUrl"} value={selectedRepository?.url ?? query} onChange={(event) => setQuery(event.target.value)} placeholder="https://gitlab.com/group/project or owner/repo" required disabled={disabled} readOnly={Boolean(selectedRepository)} />
        <span className="mt-2 block text-xs leading-5 text-zinc-600">Search checks all connected GitHub and GitLab accounts. Public URLs from any provider can be entered manually.</span>
      </label>
      {selectedRepository ? (
        <button type="button" onClick={() => { setSelectedRepository(null); setBranches([]); setSelectedBranch(""); }} className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:text-white">
          Clear selected repository
        </button>
      ) : null}
      <SubmitButton disabled={disabled || (Boolean(selectedRepository) && !selectedBranch)} />
      <div aria-live="polite" className="min-h-6">
        {state.message ? (
          <p className={state.status === "error" ? "font-mono text-sm text-violet-200" : "font-mono text-sm text-zinc-400"}>
            {state.status === "error" ? "! " : "// "}
            {state.message}
          </p>
        ) : null}
        {disabled ? <p className="font-mono text-sm text-zinc-600">Create a project before attaching repositories.</p> : null}
      </div>
    </form>
  );
}
