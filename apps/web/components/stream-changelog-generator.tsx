"use client";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { type ManualChangelogFormState } from "@/app/dashboard/projects/[slug]/changelogs/actions";
import { Button } from "@commitglow/ui";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type StreamChangelogGeneratorProps = {
  projectId: string;
  projectSlug: string;
  repositoryId: string;
  commits: Array<{ sha: string; message: string }>;
  saveAction: (_: ManualChangelogFormState, formData: FormData) => Promise<ManualChangelogFormState>;
  onSaved?: () => void | Promise<void>;
};

const saveInitialState: ManualChangelogFormState = { status: "idle", message: "" };

type StreamChunk = {
  type?: string;
  delta?: string;
  textDelta?: string;
  errorText?: string;
  error?: unknown;
};

function parseStreamLine(line: string): StreamChunk | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed === "data: [DONE]") {
    return null;
  }

  const payload = trimmed.startsWith("data: ")
    ? trimmed.slice(6)
    : trimmed.startsWith("{")
      ? trimmed
      : trimmed.includes("\t{")
        ? trimmed.slice(trimmed.indexOf("\t{") + 1)
        : "";

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as StreamChunk;
  } catch {
    return null;
  }
}

function getDelta(chunk: StreamChunk) {
  return chunk.delta ?? chunk.textDelta ?? "";
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" disabled={pending} className="w-full">
      {pending ? "Saving..." : "Save Changelog Draft"}
    </Button>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-2">
      <div className="ai-skeleton h-3 w-11/12 rounded-sm bg-white/10" />
      <div className="ai-skeleton h-3 w-8/12 rounded-sm bg-white/10" />
      <div className="ai-skeleton h-3 w-10/12 rounded-sm bg-white/10" />
    </div>
  );
}

export function StreamChangelogGenerator({ projectId, projectSlug, repositoryId, commits, saveAction, onSaved }: StreamChangelogGeneratorProps) {
  const [state, formAction] = useActionState<ManualChangelogFormState, FormData>(
    saveAction,
    saveInitialState
  );
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [output, setOutput] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");

  function startGeneration() {
    setSessionOpen(true);
    setShowReasoning(false);
    setStatus("generating");
    setOutput("");
    setReasoning("");
    setError("");

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    setTitle(`Changelog ${dateStr}`);
    setVersion(`v0.1.0+${dateStr.replace(/-/g, "")}`);

    fetch("/api/changelog/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commits })
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((err) => {
            throw new Error(err.error ?? `Server returned ${response.status}`);
          });
        }

        const reader = response.body?.getReader();

        if (!reader) {
          throw new Error("No response stream.");
        }

        const decoder = new TextDecoder();
        const streamReader = reader;
        let buffer = "";

        function consumeLine(line: string) {
          const chunk = parseStreamLine(line);

          if (!chunk?.type) {
            return;
          }

          if (chunk.type === "reasoning-delta" || chunk.type === "reasoning-part-delta") {
            setReasoning((prev) => prev + getDelta(chunk));
          } else if (chunk.type === "text-delta") {
            setOutput((prev) => prev + getDelta(chunk));
          } else if (chunk.type === "error") {
            throw new Error(chunk.errorText || "AI stream returned an error.");
          } else if (chunk.type === "finish") {
            setStatus("done");
          }
        }

        function processChunk(): Promise<void> {
          return streamReader.read().then(({ done, value }) => {
            if (done) {
              if (buffer.trim()) {
                consumeLine(buffer);
              }

              setStatus("done");
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              consumeLine(line);
            }

            return processChunk();
          });
        }

        return processChunk();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Generation failed.");
        setStatus("error");
      });
  }

  useEffect(() => {
    if (state.status === "success") {
      onSaved?.();
      setStatus("idle");
      setOutput("");
      setReasoning("");
      setSessionOpen(false);
    }
  }, [state.status, onSaved]);

  const steps = [
    { label: "Read commits", done: commits.length > 0, active: status === "generating" && !reasoning && !output },
    { label: "Reason impact", done: Boolean(reasoning), active: status === "generating" && Boolean(reasoning) && !output },
    { label: "Write markdown", done: Boolean(output), active: status === "generating" && Boolean(output) },
    { label: "Ready to save", done: status === "done" && Boolean(output.trim()), active: false }
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <p className="font-mono text-sm leading-7 text-zinc-500">
          AI-powered generation reads your {commits.length} selected commit{commits.length === 1 ? "" : "s"} and opens a live generation session with streamed reasoning and markdown output.
        </p>
        <Button type="button" variant="primary" onClick={startGeneration} disabled={commits.length === 0 || status === "generating"} className="w-full">
          {status === "generating" ? "Generating..." : "Generate with AI"}
        </Button>
      </div>

      {sessionOpen ? (
        <div className="ai-session fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ai-session-title">
          <div className="ai-session-panel relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-sm border border-violet-300/25 bg-[#050507] shadow-[0_32px_140px_rgba(0,0,0,0.75),0_0_80px_rgba(139,92,246,0.14)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/80 to-transparent" />

            <div className="border-b border-white/10 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// AI Generation Session</p>
                  <h2 id="ai-session-title" className="mt-3 font-mono text-2xl text-white">Build changelog draft</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">A focused transcript, not a chat. CommitGlow streams the model workbench, optional reasoning, and final changelog markdown.</p>
                </div>
                <button type="button" onClick={() => setSessionOpen(false)} disabled={status === "generating"} className="rounded-sm border border-white/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:border-violet-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-4">
                {steps.map((step) => (
                  <div key={step.label} className={["rounded-sm border px-3 py-2", step.done ? "border-violet-300/30 bg-violet-500/10" : step.active ? "border-violet-300/40 bg-white/[0.04]" : "border-white/10 bg-black/20"].join(" ")}>
                    <div className="flex items-center gap-2">
                      <span className={["h-1.5 w-1.5 rounded-full", step.done ? "bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)]" : step.active ? "animate-pulse bg-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.7)]" : "bg-zinc-800"].join(" ")} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{step.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-4">
                <div className="ai-message-enter max-w-3xl rounded-sm border border-white/10 bg-white/[0.02] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">Input Context</p>
                  <p className="mt-2 font-mono text-sm leading-6 text-zinc-300">Generate a product changelog from {commits.length} selected commit{commits.length === 1 ? "" : "s"}. Keep it scoped to release notes only.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {commits.slice(0, 8).map((commit) => (
                      <span key={commit.sha} className="rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">{commit.sha.slice(0, 7)}</span>
                    ))}
                    {commits.length > 8 ? <span className="rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-700">+{commits.length - 8} more</span> : null}
                  </div>
                </div>

                <div className="ai-message-enter ml-auto max-w-3xl rounded-sm border border-violet-300/20 bg-violet-500/[0.06] p-4 [animation-delay:90ms]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">AI Workbench</p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">{status === "done" ? "complete" : status === "error" ? "error" : "streaming"}</span>
                  </div>

                  {status === "generating" && !reasoning && !output ? <div className="mt-4"><SkeletonLines /></div> : null}

                  {reasoning ? (
                    <div className="mt-4 rounded-sm border border-white/10 bg-black/30">
                      <button type="button" onClick={() => setShowReasoning((value) => !value)} className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:text-white">
                        <span>// Reasoning {status === "generating" ? "is streaming" : "trace"}</span>
                        <span>{showReasoning ? "Hide" : "Show"}</span>
                      </button>
                      <div className="border-t border-white/10 px-4 py-3">
                        {showReasoning ? (
                          <pre className="reasoning-text whitespace-pre-wrap font-mono text-[11px] leading-6 text-zinc-500">{reasoning}</pre>
                        ) : (
                          <p className="reasoning-text line-clamp-2 font-mono text-[11px] leading-6 text-zinc-600">{reasoning}</p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-sm border border-violet-300/20 bg-black/30 p-4">
                    {status === "generating" && !output ? (
                      <div className="space-y-3">
                        <div className="ai-skeleton h-4 w-32 rounded-sm bg-violet-300/20" />
                        <SkeletonLines />
                      </div>
                    ) : (
                      <Streamdown plugins={{ code }} caret={status === "generating" ? "block" : undefined} isAnimating={status === "generating"}>
                        {output || "// Waiting for output..."}
                      </Streamdown>
                    )}
                  </div>

                  {status === "error" ? (
                    <div className="mt-4 rounded-sm border border-violet-300/30 bg-violet-500/10 p-4 font-mono text-sm text-violet-100">
                      ! {error}
                      <Button type="button" variant="ghost" onClick={startGeneration} className="mt-3">Retry</Button>
                    </div>
                  ) : null}

                  {status === "done" && !output.trim() ? (
                    <div className="mt-4 rounded-sm border border-violet-300/30 bg-violet-500/10 p-4 font-mono text-sm leading-6 text-violet-100">! The model streamed reasoning but did not produce final changelog text. Retry generation or select fewer commits.</div>
                  ) : null}
                </div>
              </div>
            </div>

            {status === "done" && output.trim() ? (
              <div className="border-t border-white/10 bg-black/20 p-5 sm:p-6">
                <form action={formAction} className="space-y-4">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="projectSlug" value={projectSlug} />
                  <input type="hidden" name="repositoryId" value={repositoryId} />
                  <input type="hidden" name="title" value={title} />
                  <input type="hidden" name="version" value={version} />
                  <input type="hidden" name="body" value={output} />
                  <input type="hidden" name="selectedCommits" value={commits.map((c) => c.sha).join(",")} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Title</span>
                      <input name="title-display" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-violet-300/70 focus:ring-2 focus:ring-violet-300/20" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Version</span>
                      <input name="version-display" value={version} onChange={(event) => setVersion(event.target.value)} maxLength={48} className="w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-violet-300/70 focus:ring-2 focus:ring-violet-300/20" />
                    </label>
                  </div>

                  <SaveButton />
                </form>
              </div>
            ) : null}
          </div>
        </div>
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
