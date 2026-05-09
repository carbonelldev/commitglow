"use client";

import { Button } from "@commitglow/ui";
import {
  buildHtmlExport,
  buildJsonExport,
  buildMarkdownExport,
  buildShareText,
  buildShareUrls,
  getChangelogBullets,
  markdownToPlainText,
  slugifyExportName,
  type ChangelogShareInput,
  type ChangelogSharePlatform,
} from "@/lib/changelog-share";
import Image from "next/image";
import { useState } from "react";

type ChangelogShareActionsProps = ChangelogShareInput & {
  className?: string;
  compact?: boolean;
};

type Status = "idle" | "copied" | "downloaded" | "shared" | "failed";
type PreviewMode = "image" | "markdown" | "post" | "exports" | "platforms";

const platforms: Array<{ key: ChangelogSharePlatform; label: string; needsUrl?: boolean }> = [
  { key: "twitter", label: "X/Twitter" },
  { key: "threads", label: "Threads" },
  { key: "linkedin", label: "LinkedIn", needsUrl: true },
  { key: "facebook", label: "Facebook", needsUrl: true },
  { key: "bluesky", label: "Bluesky" },
  { key: "reddit", label: "Reddit", needsUrl: true },
  { key: "hackernews", label: "Hacker News", needsUrl: true },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "telegram", label: "Telegram" },
  { key: "email", label: "Email" },
];

const shareSteps: Array<{ mode: PreviewMode; label: string; description: string }> = [
  { mode: "image", label: "Preview image", description: "Check the generated social card first." },
  { mode: "markdown", label: "Review markdown", description: "Verify the changelog text before copying." },
  { mode: "post", label: "Preview post", description: "See how a social post will look." },
  { mode: "exports", label: "Export files", description: "Download the formats you need." },
  { mode: "platforms", label: "Publish", description: "Open share flows or copy platform kits." },
];

function copyTextFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;left:-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function copyText(value: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }

  copyTextFallback(value);
}

function downloadFile(filename: string, content: string | Blob, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (context.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);

  lines.slice(0, maxLines).forEach((line, index) => {
    const suffix = index === maxLines - 1 && words.length > line.split(/\s+/).length ? "â€¦" : "";
    context.fillText(`${line}${suffix}`, x, y + index * lineHeight);
  });

  return y + Math.max(1, lines.length) * lineHeight;
}

async function createPngImage(input: ChangelogShareInput) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  const gradient = context.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, "#050507");
  gradient.addColorStop(0.55, "#111016");
  gradient.addColorStop(1, "#2e1065");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1200, 630);

  context.fillStyle = "rgba(139, 92, 246, 0.22)";
  context.beginPath();
  context.arc(980, 60, 260, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(196, 181, 253, 0.34)";
  context.lineWidth = 2;
  context.strokeRect(48, 48, 1104, 534);

  context.fillStyle = "rgba(255, 255, 255, 0.08)";
  context.fillRect(48, 120, 1104, 1);

  context.font = "700 24px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  context.fillStyle = "#c4b5fd";
  context.fillText("// CommitGlow changelog", 78, 92);

  context.font = "700 56px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  context.fillStyle = "#ffffff";
  const headingBottom = drawWrappedText(context, input.title.trim() || "Changelog", 78, 190, 800, 64, 2);

  context.font = "500 22px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  context.fillStyle = "#a1a1aa";
  const meta = [input.version?.trim(), input.source?.trim()].filter(Boolean).join(" Â· ") || "Release update";
  context.fillText(meta, 78, headingBottom + 22);

  const bullets = getChangelogBullets(input.body, 4);
  let y = headingBottom + 78;
  context.font = "400 26px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

  for (const bullet of bullets.length ? bullets : [markdownToPlainText(input.body).slice(0, 180)]) {
    context.fillStyle = "#c4b5fd";
    context.fillText("-", 82, y);
    context.fillStyle = "#e4e4e7";
    y = drawWrappedText(context, bullet, 120, y, 910, 36, 2) + 14;
    if (y > 526) break;
  }

  context.font = "600 20px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  context.fillStyle = "#71717a";
  context.fillText(input.url?.trim() || "commitglow.com", 78, 548);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Image export failed."));
    }, "image/png", 0.96);
  });
}

function createSvgImage(input: ChangelogShareInput) {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const bullets = getChangelogBullets(input.body, 4);
  const meta = [input.version?.trim(), input.source?.trim()].filter(Boolean).join(" Â· ") || "Release update";
  const bulletLines = (bullets.length ? bullets : [markdownToPlainText(input.body).slice(0, 180)]).map((bullet, index) => `<text x="118" y="${336 + index * 52}" fill="#e4e4e7" font-size="24">- ${escape(bullet.slice(0, 86))}</text>`).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">\n<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#050507"/><stop offset=".58" stop-color="#111016"/><stop offset="1" stop-color="#2e1065"/></linearGradient></defs>\n<rect width="1200" height="630" fill="url(#bg)"/>\n<circle cx="980" cy="60" r="260" fill="#8b5cf6" opacity=".22"/>\n<rect x="48" y="48" width="1104" height="534" fill="none" stroke="#c4b5fd" opacity=".34" stroke-width="2"/>\n<line x1="48" y1="120" x2="1152" y2="120" stroke="#fff" opacity=".08"/>\n<g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace">\n<text x="78" y="92" fill="#c4b5fd" font-size="24" font-weight="700">// CommitGlow changelog</text>\n<text x="78" y="198" fill="#fff" font-size="54" font-weight="700">${escape((input.title.trim() || "Changelog").slice(0, 34))}</text>\n<text x="78" y="254" fill="#a1a1aa" font-size="22" font-weight="500">${escape(meta.slice(0, 78))}</text>\n${bulletLines}\n<text x="78" y="548" fill="#71717a" font-size="20" font-weight="600">${escape((input.url?.trim() || "commitglow.com").slice(0, 92))}</text>\n</g>\n</svg>\n`;
}

export function ChangelogShareActions({ title, version, body, source, url, className, compact = false }: ChangelogShareActionsProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("image");
  const input = { title, version, body, source, url } satisfies ChangelogShareInput;
  const filename = slugifyExportName([title, version].filter(Boolean).join(" "));
  const shareUrls = buildShareUrls(input);
  const hasUrl = Boolean(url?.trim());
  const markdown = buildMarkdownExport(input);
  const shortPost = buildShareText(input, "twitter");
  const longPost = buildShareText(input, "linkedin");
  const svgPreview = createSvgImage(input);
  const currentStepIndex = Math.max(0, shareSteps.findIndex((step) => step.mode === previewMode));
  const currentStep = shareSteps[currentStepIndex] ?? shareSteps[0];
  const previousStep = shareSteps[currentStepIndex - 1];
  const nextStep = shareSteps[currentStepIndex + 1];

  function flash(nextStatus: Status) {
    setStatus(nextStatus);
    window.setTimeout(() => setStatus("idle"), nextStatus === "failed" ? 2600 : 1800);
  }

  async function run(action: () => void | Promise<void>, success: Status = "copied") {
    try {
      await action();
      flash(success);
    } catch {
      flash("failed");
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyText(hasUrl ? url?.trim() || buildShareText(input) : buildShareText(input));
      return;
    }

    await navigator.share({
      title: title || "Changelog",
      text: hasUrl ? "View the public changelog." : buildShareText(input),
      url: url?.trim() || undefined,
    });
  }

  async function copyImage() {
    const clipboard = navigator.clipboard as Clipboard & { write?: (data: ClipboardItem[]) => Promise<void> };

    if (!clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Image clipboard is not available.");
    }

    const blob = await createPngImage(input);
    await clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="primary" className={compact ? "min-h-9 px-3 py-2 text-[10px]" : undefined} onClick={() => setOpen(true)}>
          Share
        </Button>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600" aria-live="polite">
          {status === "copied" ? "Copied" : status === "downloaded" ? "Downloaded" : status === "shared" ? "Shared" : status === "failed" ? "Action failed" : compact ? "Export ready" : "Preview image, markdown, and social posts"}
        </span>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-black/80 p-3 pt-5 backdrop-blur-md sm:p-6 sm:pt-8" role="dialog" aria-modal="true" aria-labelledby="share-changelog-title">
          <div className="relative mb-8 flex max-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-sm border border-violet-300/25 bg-[#050507] shadow-[0_32px_140px_rgba(0,0,0,0.8),0_0_90px_rgba(139,92,246,0.16)] sm:max-h-[calc(100vh-4rem)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/80 to-transparent" />

            <div className="border-b border-white/10 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Share changelog</p>
                  <h2 id="share-changelog-title" className="mt-3 font-mono text-2xl text-white">{title || "Generated changelog"}</h2>
                  <p className="mt-2 max-w-2xl font-mono text-xs leading-6 text-zinc-500">Follow the steps from preview to publishing. Share only the changelog, never the AI reasoning trace.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-sm border border-white/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:border-violet-300/40 hover:text-white">
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-2 lg:grid-cols-5">
                {shareSteps.map((step, index) => (
                  <button key={step.mode} type="button" onClick={() => setPreviewMode(step.mode)} className={["group rounded-sm border p-3 text-left transition", previewMode === step.mode ? "border-violet-300/50 bg-violet-500/15" : index < currentStepIndex ? "border-emerald-300/20 bg-emerald-400/[0.05] hover:border-violet-300/35" : "border-white/10 bg-black/20 hover:border-violet-300/35"].join(" ")}>
                    <span className="flex items-center gap-2">
                      <span className={["grid size-5 place-items-center rounded-full border font-mono text-[10px]", previewMode === step.mode ? "border-violet-200 bg-violet-300 text-black" : index < currentStepIndex ? "border-emerald-300/50 text-emerald-200" : "border-white/10 text-zinc-600 group-hover:text-white"].join(" ")}>{index + 1}</span>
                      <span className={["font-mono text-[10px] uppercase tracking-[0.14em]", previewMode === step.mode ? "text-white" : "text-zinc-500 group-hover:text-white"].join(" ")}>{step.label}</span>
                    </span>
                    <span className="mt-2 block font-mono text-[10px] leading-5 text-zinc-600">{step.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="scrollbar-soft min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 rounded-sm border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">Step {currentStepIndex + 1} of {shareSteps.length}</p>
                  <p className="mt-1 font-mono text-sm text-white">{currentStep.label}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" className="min-h-9 px-3 py-2 text-[10px]" disabled={!previousStep} onClick={() => previousStep ? setPreviewMode(previousStep.mode) : undefined}>Back</Button>
                  <Button type="button" variant="secondary" className="min-h-9 px-3 py-2 text-[10px]" disabled={!nextStep} onClick={() => nextStep ? setPreviewMode(nextStep.mode) : undefined}>{nextStep ? "Next" : "Done"}</Button>
                </div>
              </div>

              {previewMode === "image" ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-sm border border-white/10 bg-black/30 p-3">
                    <Image src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPreview)}`} alt="Generated changelog social image preview" width={1200} height={630} unoptimized className="aspect-[1200/630] w-full rounded-sm border border-violet-300/20 object-cover" />
                  </div>
                  <div className="space-y-3 rounded-sm border border-white/10 bg-white/[0.02] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">Image card</p>
                    <p className="font-mono text-xs leading-6 text-zinc-500">Best for Instagram, LinkedIn image posts, Facebook, Threads, X/Twitter, and launch recaps.</p>
                    <Button type="button" variant="secondary" className="w-full" onClick={() => run(copyImage)}>Copy Image</Button>
                    <Button type="button" variant="secondary" className="w-full" onClick={() => run(async () => downloadFile(`${filename}.png`, await createPngImage(input), "image/png"), "downloaded")}>Download PNG</Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => run(() => downloadFile(`${filename}.svg`, svgPreview, "image/svg+xml;charset=utf-8"), "downloaded")}>Download SVG</Button>
                  </div>
                </div>
              ) : null}

              {previewMode === "markdown" ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <pre className="scrollbar-soft max-h-[58vh] overflow-auto rounded-sm border border-white/10 bg-black/30 p-4 font-mono text-xs leading-6 text-zinc-300 whitespace-pre-wrap">{markdown}</pre>
                  <div className="space-y-3 rounded-sm border border-white/10 bg-white/[0.02] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">Markdown</p>
                    <p className="font-mono text-xs leading-6 text-zinc-500">Use this for GitHub releases, docs, project updates, README sections, or any markdown-first publishing flow.</p>
                    <Button type="button" variant="secondary" className="w-full" onClick={() => run(() => copyText(markdown))}>Copy Markdown</Button>
                    <Button type="button" variant="secondary" className="w-full" onClick={() => run(() => downloadFile(`${filename}.md`, markdown, "text/markdown;charset=utf-8"), "downloaded")}>Download MD</Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => run(() => copyText(markdownToPlainText(body)))}>Copy Plain Text</Button>
                  </div>
                </div>
              ) : null}

              {previewMode === "post" ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-full border border-violet-300/30 bg-violet-500/15 font-mono text-xs text-violet-100">CG</div>
                      <div>
                        <p className="font-mono text-sm text-white">CommitGlow</p>
                        <p className="font-mono text-xs text-zinc-600">@commitglow</p>
                      </div>
                    </div>
                    <p className="mt-5 whitespace-pre-wrap font-mono text-sm leading-7 text-zinc-200">{shortPost}</p>
                    <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-3">
                      <Image src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPreview)}`} alt="Post attachment preview" width={1200} height={630} unoptimized className="rounded-lg" />
                    </div>
                    <div className="mt-4 flex gap-5 font-mono text-xs text-zinc-600"><span>Reply</span><span>Repost</span><span>Like</span><span>Share</span></div>
                  </div>
                  <div className="space-y-3 rounded-sm border border-white/10 bg-white/[0.02] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">Social post</p>
                    <p className="font-mono text-xs leading-6 text-zinc-500">Preview a short X/Twitter-style post. Copy the short version for X, Threads, or Bluesky, and the long version for LinkedIn/Facebook.</p>
                    <Button type="button" variant="secondary" className="w-full" onClick={() => run(() => copyText(shortPost))}>Copy Short Post</Button>
                    <Button type="button" variant="secondary" className="w-full" onClick={() => run(() => copyText(longPost))}>Copy Long Post</Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => run(nativeShare, "shared")}>Share Public Changelog</Button>
                  </div>
                </div>
              ) : null}

              {previewMode === "exports" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Markdown", "Portable changelog source for docs and releases.", () => downloadFile(`${filename}.md`, markdown, "text/markdown;charset=utf-8")],
                    ["Plain text", "Clean text for emails, issue trackers, and editors.", () => downloadFile(`${filename}.txt`, markdownToPlainText(body), "text/plain;charset=utf-8")],
                    ["JSON", "Structured copy with title, bullets, markdown, and text.", () => downloadFile(`${filename}.json`, buildJsonExport(input), "application/json;charset=utf-8")],
                    ["HTML", "Standalone page you can host or paste into CMS tools.", () => downloadFile(`${filename}.html`, buildHtmlExport(input), "text/html;charset=utf-8")],
                    ["PNG image", "Social card for platforms that prefer image posts.", async () => downloadFile(`${filename}.png`, await createPngImage(input), "image/png")],
                    ["SVG image", "Editable vector image for design workflows.", () => downloadFile(`${filename}.svg`, svgPreview, "image/svg+xml;charset=utf-8")],
                  ].map(([label, description, action]) => (
                    <button key={String(label)} type="button" onClick={() => run(action as () => void | Promise<void>, "downloaded")} className="rounded-sm border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-violet-300/40 hover:bg-violet-500/[0.07]">
                      <span className="font-mono text-xs uppercase tracking-[0.14em] text-white">{String(label)}</span>
                      <span className="mt-3 block font-mono text-xs leading-6 text-zinc-500">{String(description)}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {previewMode === "platforms" ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {platforms.map((platform) => {
                      const disabled = platform.needsUrl && !hasUrl;

                      return disabled ? (
                        <div key={platform.key} className="rounded-sm border border-white/5 bg-black/20 p-4 opacity-50">
                          <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{platform.label}</p>
                          <p className="mt-3 font-mono text-xs leading-6 text-zinc-700">Needs a public changelog link.</p>
                        </div>
                      ) : (
                        <a key={platform.key} href={shareUrls[platform.key]} target={platform.key === "email" ? undefined : "_blank"} rel={platform.key === "email" ? undefined : "noreferrer"} className="rounded-sm border border-white/10 bg-white/[0.02] p-4 transition hover:border-violet-300/40 hover:bg-violet-500/[0.07]">
                          <span className="font-mono text-xs uppercase tracking-[0.14em] text-white">{platform.label}</span>
                          <span className="mt-3 block font-mono text-xs leading-6 text-zinc-500">Open the best available web share flow for this platform.</span>
                        </a>
                      );
                    })}
                  </div>
                  <div className="space-y-3 rounded-sm border border-white/10 bg-white/[0.02] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">Platform kit</p>
                    <p className="font-mono text-xs leading-6 text-zinc-500">Instagram does not provide reliable prefilled web posting. Export or copy the image, then copy the caption.</p>
                    <Button type="button" variant="secondary" className="w-full" onClick={() => run(() => copyText(`${longPost}\n\nUse the exported PNG/SVG image for Instagram.`))}>Copy Instagram Caption</Button>
                    <Button type="button" variant="secondary" className="w-full" onClick={() => run(copyImage)}>Copy Image</Button>
                    {hasUrl ? <Button type="button" variant="ghost" className="w-full" onClick={() => run(() => copyText(url?.trim() || ""))}>Copy Public Link</Button> : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
