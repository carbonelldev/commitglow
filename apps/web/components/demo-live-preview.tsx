"use client";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { useEffect, useRef, useState } from "react";
import { ShareDemoLink } from "@/components/share-demo-link";
import type { DemoCommit, PublicGitProvider } from "@/lib/public-demo";

type DemoContext = {
  provider: PublicGitProvider;
  repo: string;
  repoUrl: string;
  description: string | null;
  defaultBranch: string;
  commits: DemoCommit[];
  body: string;
  aiGenerated: boolean;
  cached: boolean;
  reasoningTrace: string;
};

type StreamChunk = { type?: string; delta?: string; textDelta?: string; errorText?: string };

function parseStreamLine(line: string): StreamChunk | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed === "data: [DONE]") return null;

  const payload = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed.startsWith("{") ? trimmed : trimmed.includes("\t{") ? trimmed.slice(trimmed.indexOf("\t{") + 1) : "";

  if (!payload) return null;

  try {
    return JSON.parse(payload) as StreamChunk;
  } catch {
    return null;
  }
}

function getDelta(chunk: StreamChunk) {
  return chunk.delta ?? chunk.textDelta ?? "";
}

function containsNonEnglishScript(value: string) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0900-\u097f]/u.test(value);
}

function englishOnly(value: string) {
  return containsNonEnglishScript(value) ? "" : value;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function CommitSkeletonRows() {
  return (
    <div className="grid max-h-[520px] gap-2 overflow-hidden pr-1">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="rounded-sm border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="ai-skeleton h-3 w-6 rounded-sm bg-white/10" />
            <div className="ai-skeleton h-3 w-14 rounded-sm bg-white/10" />
          </div>
          <div className="ai-skeleton mt-3 h-3 w-11/12 rounded-sm bg-white/10" />
          <div className="ai-skeleton mt-2 h-3 w-7/12 rounded-sm bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="relative overflow-hidden rounded-md border border-white/10 bg-black/30 p-5 font-mono shadow-[0_30px_100px_rgba(0,0,0,0.25)]">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative border-b border-white/10 pb-4 text-xs uppercase tracking-[0.16em] text-zinc-600">demo workbench</div>
      <div className="relative mt-8 grid gap-4 text-sm leading-7 text-zinc-400">
        <p>Paste a public repo or swap a Git host URL to CommitGlow. We fetch commits, stream the same AI changelog prompt as the dashboard, and make the result shareable.</p>
        <p className="text-violet-200">Try: vercel/next.js, gitlab-org/gitlab, or a public Gitea URL.</p>
      </div>
    </div>
  );
}

export function DemoLivePreview({ repoInput, shareHref }: { repoInput: string; shareHref: string }) {
  const [context, setContext] = useState<DemoContext | null>(null);
  const [phase, setPhase] = useState<"idle" | "reading" | "reasoning" | "writing" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [showReasoning, setShowReasoning] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const workbenchStickRef = useRef(true);

  function isNearBottom(element: HTMLDivElement) {
    return element.scrollHeight - element.scrollTop - element.clientHeight < 48;
  }

  function updateWorkbenchStick() {
    const workbench = workbenchRef.current;
    if (workbench) workbenchStickRef.current = isNearBottom(workbench);
  }

  useEffect(() => {
    if (!repoInput) {
      setContext(null);
      setPhase("idle");
      setOutput("");
      setReasoning("");
      setError("");
      return;
    }

    const abort = new AbortController();
    abortRef.current?.abort();
    abortRef.current = abort;
    setContext(null);
    setOutput("");
    setReasoning("");
    setShowReasoning(true);
    workbenchStickRef.current = true;
    setError("");
    setPhase("reading");

    async function run() {
      try {
        const resolveResponse = await fetch("/api/demo/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo: repoInput }),
          signal: abort.signal,
        });

        if (!resolveResponse.ok) {
          const payload = await resolveResponse.json().catch(() => ({}));
          throw new Error(typeof payload.error === "string" ? payload.error : `Server returned ${resolveResponse.status}`);
        }

        const resolved = await resolveResponse.json() as DemoContext;
        setContext(resolved);

        if (resolved.cached) {
          setOutput(resolved.body);
          setReasoning(englishOnly(resolved.reasoningTrace ?? ""));
          setPhase("done");
          return;
        }

        setPhase("reasoning");

        const generateResponse = await fetch("/api/demo/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo: repoInput }),
          signal: abort.signal,
        });

        if (!generateResponse.ok) {
          const payload = await generateResponse.json().catch(() => ({}));
          throw new Error(typeof payload.error === "string" ? payload.error : `Server returned ${generateResponse.status}`);
        }

        if (generateResponse.headers.get("content-type")?.includes("application/json")) {
          const generated = await generateResponse.json() as { body?: string; aiGenerated?: boolean; cached?: boolean; reasoningTrace?: string; pending?: boolean; message?: string };

          if (generated.pending) {
            setPhase("reasoning");
            setReasoning("");

            for (let attempt = 0; attempt < 30; attempt += 1) {
              await sleep(1000);

              const pollResponse = await fetch("/api/demo/resolve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repo: repoInput }),
                signal: abort.signal,
              });

              if (!pollResponse.ok) continue;

              const polled = await pollResponse.json() as DemoContext;

              if (polled.cached && polled.body) {
                setContext(polled);
                setOutput(polled.body);
                setReasoning(englishOnly(polled.reasoningTrace ?? ""));
                setPhase("done");
                return;
              }
            }

            throw new Error(generated.message ?? "This demo is still generating. Refresh in a few seconds to reuse the saved result.");
          }

          setContext({ ...resolved, ...generated });
          setOutput(generated.body ?? "");
          setReasoning(englishOnly(generated.reasoningTrace ?? ""));
          setPhase("done");
          return;
        }

        const reader = generateResponse.body?.getReader();
        if (!reader) throw new Error("No response stream.");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const chunk = parseStreamLine(line);
            if (!chunk?.type) continue;
            if (chunk.type === "reasoning-delta" || chunk.type === "reasoning-part-delta") {
              setReasoning((prev) => englishOnly(prev + getDelta(chunk)));
              setPhase("reasoning");
            }
            if (chunk.type === "text-delta") {
              setOutput((prev) => prev + getDelta(chunk));
              setPhase("writing");
            }
            if (chunk.type === "error") throw new Error(chunk.errorText || "AI stream returned an error.");
          }
        }

        if (buffer.trim()) {
          const chunk = parseStreamLine(buffer);
          if (chunk?.type === "reasoning-delta" || chunk?.type === "reasoning-part-delta") setReasoning((prev) => englishOnly(prev + getDelta(chunk)));
          if (chunk?.type === "text-delta") setOutput((prev) => prev + getDelta(chunk));
        }

        setContext((current) => current ? { ...current, aiGenerated: true, cached: false } : current);
        setPhase("done");
      } catch (err) {
        if (abort.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Demo generation failed.");
        setPhase("error");
      }
    }

    void run();

    return () => abort.abort();
  }, [repoInput]);

  useEffect(() => {
    if (phase === "idle") return;

    const animationFrame = requestAnimationFrame(() => {
      const workbench = workbenchRef.current;

      if (workbench && workbenchStickRef.current) {
        workbench.scrollTop = workbench.scrollHeight;
      }

    });

    return () => cancelAnimationFrame(animationFrame);
  }, [context, output, phase, reasoning, showReasoning]);

  if (!repoInput && phase === "idle") return <EmptyPreview />;

  if (phase === "error") {
    return (
      <div className="rounded-md border border-red-300/30 bg-red-500/10 p-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-red-100">Demo unavailable</p>
        <p className="mt-4 font-mono text-sm leading-7 text-zinc-300">{error}</p>
      </div>
    );
  }

  const steps = [
    { key: "reading", label: "Read commits", done: Boolean(context), active: phase === "reading" },
    { key: "reasoning", label: "Reason impact", done: Boolean(reasoning) || phase === "writing" || phase === "done", active: phase === "reasoning" },
    { key: "writing", label: "Write markdown", done: phase === "done" && Boolean(output), active: phase === "writing" },
    { key: "done", label: context?.cached ? "Cache hit" : "Ready to share", done: phase === "done", active: false },
  ];
  const visibleReasoning = reasoning;

  return (
    <div className="ai-session-panel relative overflow-hidden rounded-md border border-violet-300/25 bg-[#050507] shadow-[0_32px_140px_rgba(0,0,0,0.55),0_0_80px_rgba(139,92,246,0.12)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/80 to-transparent" />
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm border border-violet-300/30 bg-violet-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-violet-100">{context?.provider ?? "public"}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">{context?.defaultBranch ?? "loading branch"}</span>
            </div>
            <h2 className="mt-3 break-all font-mono text-2xl tracking-[-0.05em] text-white sm:break-normal">{context?.repo ?? repoInput}</h2>
            <p className="mt-3 max-w-2xl font-mono text-sm leading-7 text-zinc-400">{context?.description ?? "Resolving public repository and recent commits..."}</p>
          </div>
          {context ? (
            <div className="flex flex-col gap-3 sm:items-end">
              <a className="font-mono text-xs uppercase tracking-[0.14em] text-violet-200 underline-offset-4 hover:underline" href={context.repoUrl} target="_blank" rel="noreferrer">View source repo</a>
              <ShareDemoLink href={shareHref} />
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {steps.map((step) => (
            <div key={step.key} className={["rounded-sm border px-3 py-2", step.done ? "border-violet-300/30 bg-violet-500/10" : step.active ? "border-violet-300/40 bg-white/[0.04]" : "border-white/10 bg-black/20"].join(" ")}>
              <div className="flex items-center gap-2">
                <span className={["h-1.5 w-1.5 rounded-full", step.done ? "bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)]" : step.active ? "animate-pulse bg-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.7)]" : "bg-zinc-800"].join(" ")} />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{step.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 gap-4 p-4 sm:p-5 lg:grid-cols-[0.75fr_1fr]">
        <div className="ai-message-enter rounded-sm border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-4 flex items-center justify-between font-mono text-xs uppercase tracking-[0.14em] text-zinc-600">
            <span>Recent commits</span>
            <span>{context ? `${context.commits.length} loaded` : "loading"}</span>
          </div>
          {context ? (
            <div className="grid max-h-[520px] gap-2 overflow-auto pr-1 scrollbar-soft">
              {context.commits.map((commit, index) => (
                <a key={commit.sha} href={commit.url ?? context.repoUrl} target="_blank" rel="noreferrer" className="group rounded-sm border border-white/10 bg-black/25 p-3 transition hover:border-violet-300/40 hover:bg-violet-500/10">
                  <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600"><span>{String(index + 1).padStart(2, "0")}</span><span>{commit.sha.slice(0, 7)}</span></div>
                  <p className="mt-2 line-clamp-2 font-mono text-xs leading-5 text-zinc-300 group-hover:text-white">{commit.message.split("\n")[0]}</p>
                </a>
              ))}
            </div>
          ) : <CommitSkeletonRows />}
        </div>

        <div ref={workbenchRef} onScroll={updateWorkbenchStick} className="ai-message-enter max-h-[calc(100vh-18rem)] overflow-y-auto rounded-sm border border-violet-300/20 bg-violet-500/[0.06] p-4 [animation-delay:90ms] scrollbar-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">AI Workbench</p>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">{phase === "done" ? context?.cached ? "cached" : "complete" : "streaming"}</span>
          </div>

          <div className="mt-4 rounded-sm border border-white/10 bg-black/30">
            <button type="button" onClick={() => setShowReasoning((value) => !value)} className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:text-white">
              <span>// Reasoning {phase === "reasoning" ? "is streaming" : reasoning ? "trace" : "pending"}</span>
              <span>{showReasoning ? "Hide" : "Show"}</span>
            </button>
            <div className="border-t border-white/10 px-4 py-3">
              {visibleReasoning ? (
                showReasoning ? (
                  <pre className="reasoning-text whitespace-pre-wrap break-words font-mono text-[11px] leading-6 text-zinc-500">{visibleReasoning}</pre>
                ) : (
                  <p className="reasoning-text line-clamp-2 font-mono text-[11px] leading-6 text-zinc-600">{visibleReasoning}</p>
                )
              ) : (
                <p className="font-mono text-[11px] leading-6 text-zinc-700">No reasoning trace was streamed by the model.</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-sm border border-violet-300/15 bg-black/25 p-4">
            {output ? (
              <>
                <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.14em]"><span className="text-zinc-600">{context?.aiGenerated ? "AI generated markdown" : "Generated markdown"}</span><span className="text-violet-200">{context?.cached ? "cache hit" : phase === "writing" ? "live stream" : "saved preview"}</span></div>
                <Streamdown className="commitglow-markdown" plugins={{ code }} caret={phase === "writing" ? "block" : undefined} isAnimating={phase === "writing"} shikiTheme={["github-dark", "github-dark"]}>{output}</Streamdown>
              </>
            ) : (
              <><SkeletonLines /><p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-zinc-600">{phase === "reading" ? "Reading public repository..." : phase === "reasoning" ? "Preparing AI stream..." : "Waiting for markdown..."}</p></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
