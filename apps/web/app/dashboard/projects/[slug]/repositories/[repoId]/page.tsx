"use client";

import { StreamChangelogGenerator } from "@/components/stream-changelog-generator";
import { SyncRepositoryButton } from "@/components/sync-repository-button";
import { getRepositoryCommits, saveGeneratedChangelog, type CommitSelectionEntry } from "@/app/dashboard/projects/[slug]/changelogs/actions";
import { getRepositoryDetailData } from "@/app/dashboard/repositories/actions";
import { Card } from "@commitglow/ui";
import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";

const providerIcons: Record<string, ReactElement> = {
  github: (
    <svg aria-hidden="true" className="h-4 w-4 text-zinc-200" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  ),
  gitlab: (
    <svg aria-hidden="true" className="h-4 w-4 text-zinc-200" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 23.999L15.534 13.134H8.466L12 23.999zM2.996 13.134L0 13.134 3.93 16.119 2.996 13.134zM24 13.134L21.004 13.134 20.07 16.119 24 13.134zM5.541 9.003L8.466 13.134 3.93 16.119 5.541 9.003zM18.459 9.003L20.07 16.119 15.534 13.134 18.459 9.003zM8.466 13.134L12 1.536 15.534 13.134 8.466 13.134z" />
    </svg>
  ),
  gitea: (
    <svg aria-hidden="true" className="h-4 w-4 text-zinc-200" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" opacity="0.2" />
      <path d="M12 4C7.58 4 4 7.58 4 12c0 3.53 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0020 12c0-4.42-3.58-8-8-8z" />
    </svg>
  )
};

function ProviderBadge({ provider, url }: { provider: string; url: string }) {
  const icon = providerIcons[provider] ?? null;

  return (
    <span className="group/provider relative inline-flex items-center gap-1.5 rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-violet-300/40">
      {icon}
      {provider}
      <span className="pointer-events-none absolute -top-1 left-1/2 z-50 hidden -translate-x-1/2 -translate-y-full rounded-sm border border-violet-300/30 bg-[#050507]/98 px-3 py-2 font-mono text-[10px] leading-relaxed text-zinc-400 shadow-[0_12px_48px_rgba(0,0,0,0.5)] opacity-0 transition group-hover/provider:block group-hover/provider:opacity-100">
        {url}
      </span>
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={["ai-skeleton rounded-sm bg-white/10", className].join(" ")} />;
}

function RepositoryLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl" aria-busy="true" aria-label="Loading repository data">
      <div className="border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Repository</p>
          <SkeletonBlock className="h-7 w-24" />
        </div>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <SkeletonBlock className="h-9 w-4/5 max-w-xl sm:h-10" />
            <SkeletonBlock className="mt-4 h-4 w-full max-w-lg" />
          </div>
          <SkeletonBlock className="h-9 w-28" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-4 h-8 w-24" />
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.7fr)]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <SkeletonBlock className="h-6 w-40" />
            <div className="flex flex-wrap items-center gap-3">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-7 w-24" />
            </div>
          </div>
          <div className="space-y-1.5 pr-1">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-start gap-3 rounded-sm border border-white/10 bg-white/[0.02] p-3">
                <SkeletonBlock className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-4 w-11/12" />
                  <SkeletonBlock className="mt-2 h-3 w-7/12" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card>
          <div className="mb-5 flex items-center justify-between gap-4">
            <SkeletonBlock className="h-6 w-44" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <div className="space-y-3">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function RepositoryDetailPage({ params }: { params: Promise<{ slug: string; repoId: string }> }) {
  return <RepositoryDetailContent params={params} />;
}

function RepositoryDetailContent({ params }: { params: Promise<{ slug: string; repoId: string }> }) {
  const [slug, setSlug] = useState("");
  const [repoId, setRepoId] = useState("");
  const [repository, setRepository] = useState<{
    id: string;
    provider: string;
    owner: string;
    name: string;
    url: string;
    defaultBranch: string;
    isPrivate: boolean;
    updatedAt: string;
  } | null>(null);
  const [commits, setCommits] = useState<CommitSelectionEntry[]>([]);
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set());
  const [project, setProject] = useState<{ id: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshRepositoryData = useCallback(async (repositoryId: string) => {
    const [detailData, commitData] = await Promise.all([
      getRepositoryDetailData(repositoryId),
      getRepositoryCommits(repositoryId)
    ]);

    if (!detailData) {
      setError("Repository not found.");
      setLoading(false);
      return;
    }

    setRepository({ ...detailData.repository, updatedAt: detailData.repository.updatedAt instanceof Date ? detailData.repository.updatedAt.toISOString() : String(detailData.repository.updatedAt) });
    setProject(detailData.project);
    setCommits(commitData.commits);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    params.then((parsed) => {
      setSlug(parsed.slug);
      setRepoId(parsed.repoId);
      refreshRepositoryData(parsed.repoId).catch(() => {
        setError("Failed to load repository data.");
        setLoading(false);
      });
    });
  }, [params, refreshRepositoryData]);

  useEffect(() => {
    const unusedCommits = commits.filter((commit) => !commit.usedInChangelog);
    setSelectedCommits(new Set(unusedCommits.map((commit) => commit.sha)));
  }, [commits]);

  function toggleCommit(sha: string) {
    setSelectedCommits((prev) => {
      const next = new Set(prev);

      if (next.has(sha)) {
        next.delete(sha);
      } else {
        next.add(sha);
      }

      return next;
    });
  }

  function toggleAll() {
    const unused = commits.filter((commit) => !commit.usedInChangelog).length;
    const selectedUnused = commits.filter((commit) => !commit.usedInChangelog && selectedCommits.has(commit.sha)).length;

    if (selectedUnused === unused && unused > 0) {
      const usedShas = new Set(commits.filter((commit) => commit.usedInChangelog).map((commit) => commit.sha));
      setSelectedCommits(usedShas);
    } else {
      setSelectedCommits(new Set(commits.filter((commit) => !commit.usedInChangelog).map((commit) => commit.sha)));
    }
  }

  const handleGeneratedChangelogSaved = useCallback(() => {
    if (repository) {
      void refreshRepositoryData(repository.id);
    }
  }, [repository?.id, refreshRepositoryData]);

  if (loading) {
    return <RepositoryLoadingSkeleton />;
  }

  if (error || !repository) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="border-b border-white/10 pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Repository</p>
          <p className="mt-4 font-mono text-2xl text-zinc-500">{error || "Repository not found."}</p>
        </div>
      </div>
    );
  }

  const unusedSelected = commits.filter((commit) => !commit.usedInChangelog && selectedCommits.has(commit.sha)).length;
  const usedCount = commits.filter((commit) => commit.usedInChangelog).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Repository</p>
          <ProviderBadge provider={repository.provider} url={repository.url} />
        </div>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="break-all font-mono text-3xl text-white sm:break-normal sm:text-4xl">{repository.owner}/{repository.name}</h1>
            <p className="mt-3 max-w-2xl text-zinc-400">
              <a href={repository.url} target="_blank" rel="noreferrer" className="break-all text-zinc-500 transition hover:text-violet-200">{repository.url}</a>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SyncRepositoryButton repositoryId={repository.id} onSynced={() => refreshRepositoryData(repository.id)} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Branch</p>
          <p className="mt-4 font-mono text-lg text-white">{repository.defaultBranch}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Visibility</p>
          <p className="mt-4 font-mono text-lg text-white">{repository.isPrivate ? "Private" : "Public"}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Commits</p>
          <p className="mt-4 font-mono text-3xl text-white sm:text-4xl">{commits.length}</p>
        </Card>
        <Card>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Unused</p>
          <p className="mt-4 font-mono text-3xl text-white sm:text-4xl">{commits.length - usedCount}</p>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.7fr)]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="font-mono text-lg text-white">Synced commits</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{unusedSelected} selected</span>
              <button
                type="button"
                onClick={toggleAll}
                className="rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-violet-300/40 hover:text-white"
              >
                {unusedSelected === commits.filter((c) => !c.usedInChangelog).length ? "Deselect all" : "Select all"}
              </button>
            </div>
          </div>
          {commits.length === 0 ? (
            <Card>
              <div className="rounded-sm border border-dashed border-white/10 p-6">
                <p className="font-mono text-xl text-white">No commits synced yet.</p>
                <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Sync this repository to pull in the latest commits from GitHub.</p>
              </div>
            </Card>
          ) : (
            <div className="max-h-[600px] space-y-1.5 overflow-y-auto pr-1 scrollbar-soft">
              {commits.map((commit) => {
                const used = commit.usedInChangelog;
                const selected = selectedCommits.has(commit.sha);

                return (
                  <label
                    key={commit.sha}
                    className={[
                      "flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition",
                      used
                        ? "border-zinc-800 bg-black/20 opacity-60"
                        : selected
                          ? "border-violet-300/40 bg-violet-500/10"
                          : "border-white/10 bg-white/[0.02] hover:border-violet-300/30"
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCommit(commit.sha)}
                      disabled={used}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-white/20 bg-black/40 accent-violet-400 disabled:opacity-30"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs leading-5 text-zinc-300 line-clamp-2">
                        {used ? (
                          <span className="mr-2 rounded-sm border border-zinc-800 px-1 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">used</span>
                        ) : null}
                        {commit.message}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px]">
                        {commit.authorName ? (
                          <span className="font-mono uppercase tracking-[0.1em] text-zinc-600">{commit.authorName}</span>
                        ) : null}
                        {commit.committedAt ? (
                          <span className="font-mono text-zinc-700">{formatDate(commit.committedAt)}</span>
                        ) : null}
                        <span className="font-mono text-zinc-700">{commit.sha.slice(0, 7)}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <Card>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-mono text-lg text-white">Generate changelog</h2>
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{unusedSelected} selected</span>
          </div>
          {project ? (
            <StreamChangelogGenerator
              projectId={project.id}
              projectSlug={project.slug}
              repositoryId={repository.id}
              commits={commits
                .filter((commit) => selectedCommits.has(commit.sha))
                .map((commit) => ({ sha: commit.sha, message: commit.message, changeSummary: commit.changeSummary }))}
              saveAction={saveGeneratedChangelog}
              onSaved={handleGeneratedChangelogSaved}
            />
          ) : null}
        </Card>
      </div>
    </div>
  );
}
