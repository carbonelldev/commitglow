import type { Metadata } from "next";
import { AnchorButton, Card } from "@commitglow/ui";
import { billingPrinciples, planList } from "@/lib/plans";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HomepageGreeting, HomepageCtaButtons } from "@/components/auth-aware-cta";
import { seo } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI Changelog Generator for Release-Ready Commits | CommitGlow",
  description: "Connect repositories, select shipped commits, and generate clean markdown changelogs with streamed AI drafting. Built for developer release workflows.",
  alternates: {
    canonical: seo.siteUrl,
  },
  openGraph: {
    title: "AI Changelog Generator for Release-Ready Commits | CommitGlow",
    description: "Connect repositories, select shipped commits, and generate clean markdown changelogs with streamed AI drafting.",
    url: seo.siteUrl,
  },
  twitter: {
    title: "AI Changelog Generator for Release-Ready Commits | CommitGlow",
    description: "Turn selected commits into clean markdown changelogs with streamed AI drafting.",
  },
};

const pipeline = [
  ["01", "repository", "Sync repository", "Pull commits into a project workspace from GitHub, GitLab, Bitbucket, or Gitea."],
  ["02", "selection", "Select what shipped", "Choose unused commits so every changelog stays scoped to the release."],
  ["03", "spark", "Stream the draft", "Watch CommitGlow build focused release-note markdown from the selected change set."],
  ["04", "history", "Save history", "Keep generated changelogs attached to the project for future releases."],
] as const;

const workflowStats = [
  ["23", "commits synced"],
  ["18", "selected"],
  ["01", "draft saved"],
] as const;

const capabilities = [
  ["workspace", "Workspace release desks", "Separate personal, product, and team work without mixing changelog history."],
  ["project", "Project-level context", "Attach repositories to products so generated notes stay tied to the thing users know."],
  ["selection", "Commit selection", "Skip noise, chores, and already-used commits before the model writes anything."],
  ["markdown", "Markdown output", "Copy clean release notes into GitHub, docs, email, or your own publishing flow."],
] as const;

const outputs = [
  ["megaphone", "Product changelog", "A concise user-facing summary with highlights, fixes, and important changes."],
  ["terminal", "Technical release notes", "Commit-aware markdown that keeps scope, versions, and repository context clear."],
  ["edit", "Manual draft fallback", "Write a project-wide changelog when there is no repository source yet."],
] as const;

const proofPoints = [
  ["Streamed AI session", "Generation opens as a focused transcript, not a chat window."],
  ["Unused commit tracking", "Previously generated commits are marked so releases do not repeat themselves."],
  ["Private repo path", "Workspace provider connections are ready for private repository generation."],
  ["Open-source core", "Built around developer-owned markdown instead of locked-in release content."],
] as const;

const pricingNotes = planList.map((plan) => {
  const generationLabel = plan.slug === "team" ? "included generations" : "generations";

  return `${plan.label}: ${plan.includedGenerations.toLocaleString("en-US")} ${generationLabel}`;
});

const demoCommits = [
  ["feat", "Stream AI changelog drafts from selected commits", true],
  ["fix", "Prevent generated commits from repeating in the next draft", true],
  ["ui", "Tighten repository sync empty state", true],
  ["chore", "Bump dashboard test fixtures", false],
] as const;

const demoDraft = [
  "Added live AI changelog drafting for selected repository commits.",
  "Generated commits are now marked as used so future releases stay clean.",
  "Repository sync states now explain what to do before generating notes.",
] as const;

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 16 16">
      <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function PromptIcon() {
  return (
    <span aria-hidden="true" className="font-mono text-violet-100">&gt;_</span>
  );
}

function ProductIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", viewBox: "0 0 24 24" } as const;

  switch (name) {
    case "workspace":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="M4 6.5h7v7H4zM13 4.5h7v5h-7zM13 12h7v7.5h-7zM4 16h7v3.5H4z" />
        </svg>
      );
    case "project":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="M4 6.5h6l2 2h8v9H4z" />
          <path d="M8 13h8M8 16h5" />
        </svg>
      );
    case "repository":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="M7 5.5h10a2 2 0 0 1 2 2v12H8a3 3 0 0 1-3-3v-9a2 2 0 0 1 2-2Z" />
          <path d="M8 16.5h11M9 9h5" />
        </svg>
      );
    case "selection":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="m5 12 4 4L19 6" />
          <path d="M4 4h7M4 20h16" />
        </svg>
      );
    case "spark":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="M12 3.5 14.2 9l5.3 2-5.3 2L12 18.5 9.8 13l-5.3-2 5.3-2z" />
          <path d="M19 4v3M20.5 5.5h-3M5 17v2M6 18H4" />
        </svg>
      );
    case "history":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="M5 7v5h5" />
          <path d="M5.7 12A7 7 0 1 0 8 6.8L5 9.5" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
    case "markdown":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="M4 7h16v10H4z" />
          <path d="M7 14V10l2 2 2-2v4M15 10v4M13.5 12.5 15 14l1.5-1.5" />
        </svg>
      );
    case "megaphone":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="M4 13h3l9 4V7l-9 4H4z" />
          <path d="m7 13 1 5h3M19 10.5v3" />
        </svg>
      );
    case "terminal":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="M4 6h16v12H4z" />
          <path d="m7 10 2 2-2 2M11 14h5" />
        </svg>
      );
    case "edit":
      return (
        <svg aria-hidden="true" className={className} {...common}>
          <path d="m14.5 5.5 4 4L9 19H5v-4z" />
          <path d="m13 7 4 4" />
        </svg>
      );
    default:
      return null;
  }
}

function ReleasePipelinePreview() {
  return (
    <div className="relative overflow-hidden rounded-md border border-violet-200/40 bg-black/50 p-4 shadow-[0_0_52px_rgba(139,92,246,0.12)] sm:p-5">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute bottom-10 right-6 hidden h-28 w-28 border border-violet-300/20 bg-violet-500/[0.03] lg:block" />
      <div className="relative flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
        <span>release pipeline</span>
        <span className="text-violet-200">live draft</span>
      </div>
      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        {workflowStats.map(([value, label]) => (
          <div key={label} className="rounded-sm border border-white/10 bg-white/[0.025] p-4 font-mono">
            <p className="text-3xl tracking-[-0.06em] text-white">{value}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-zinc-600">{label}</p>
          </div>
        ))}
      </div>
      <div className="relative mt-5 rounded-sm border border-white/10 bg-black/35 p-4 font-mono">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
          <span className="rounded-sm border border-violet-300/30 bg-violet-500/10 px-2 py-1 text-violet-100">main</span>
          <span>ultro/commitglow</span>
          <span>v1.4.0</span>
        </div>
        <div className="mt-5 border-l border-violet-300/40 pl-4">
          <p className="text-xl tracking-[-0.05em] text-white">Release notes draft</p>
          <div className="mt-4 grid gap-3 text-xs leading-6 text-zinc-400">
            <p><span className="text-violet-200">+</span> Added streamed changelog generation for selected commits.</p>
            <p><span className="text-violet-200">+</span> Marked generated commits as used to prevent repeated release notes.</p>
            <p><span className="text-violet-200">+</span> Improved repository sync flow inside project workspaces.</p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-sm border border-white/10 bg-black/50">
          <div className="h-full w-[82%] bg-violet-300/80 shadow-[0_0_18px_rgba(196,181,253,0.5)]" />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
          <span>streaming markdown...</span>
          <span aria-hidden="true" className="cursor-blink h-4 w-2 bg-violet-300" />
        </div>
      </div>
    </div>
  );
}

function MiniDemo() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8 border-t border-white/10 px-5 py-12 sm:px-8 lg:grid-cols-[0.72fr_1fr]">
      <div>
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Mini demo</p>
        <h2 className="font-mono text-3xl leading-tight tracking-[-0.05em] text-white sm:text-5xl">
          From commit noise to publishable notes.
        </h2>
        <p className="mt-6 max-w-xl font-mono text-sm leading-7 text-zinc-400">
          Select the changes that belong in this release. CommitGlow ignores the rest and drafts a clean changelog you can save or copy.
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-white/10 bg-black/30">
        <div className="grid border-b border-white/10 md:grid-cols-2">
          <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 font-mono text-sm text-white">
                <span className="grid h-8 w-8 place-items-center rounded-sm border border-violet-300/30 bg-violet-500/10 text-violet-100">
                  <ProductIcon name="selection" />
                </span>
                Selected commits
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">3 of 4</span>
            </div>
            <div className="grid gap-2">
              {demoCommits.map(([type, message, selected]) => (
                <div key={message} className={selected ? "rounded-sm border border-violet-300/30 bg-violet-500/10 p-3" : "rounded-sm border border-white/10 bg-black/20 p-3 opacity-55"}>
                  <div className="flex items-start gap-3">
                    <span className={selected ? "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-sm border border-violet-200 bg-violet-300 text-black" : "mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-white/15 bg-black/40"}>
                      {selected ? (
                        <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 12 12">
                          <path d="m2.5 6 2 2 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </svg>
                      ) : null}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-violet-200/80">{type}</p>
                      <p className="mt-1 font-mono text-xs leading-5 text-zinc-300">{message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden p-5">
            <div className="absolute -right-12 top-8 h-32 w-32 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="relative mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 font-mono text-sm text-white">
                <span className="grid h-8 w-8 place-items-center rounded-sm border border-violet-300/30 bg-violet-500/10 text-violet-100">
                  <ProductIcon name="spark" />
                </span>
                Generated draft
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-violet-200">saved</span>
            </div>
            <div className="relative rounded-sm border border-white/10 bg-black/35 p-4 font-mono">
              <p className="text-lg tracking-[-0.04em] text-white">v1.4.0 Release Notes</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">Highlights</p>
              <div className="mt-4 grid gap-3">
                {demoDraft.map((line) => (
                  <p key={line} className="flex gap-3 text-xs leading-6 text-zinc-400">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-200" />
                    <span>{line}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4 font-mono text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Skipped chore commit stays out of the release copy.</span>
          <span className="text-violet-200">markdown ready -&gt;</span>
        </div>
      </div>
    </section>
  );
}

function PublicDemoBanner() {
  return (
    <section className="mx-auto w-full max-w-7xl border-t border-white/10 px-5 py-12 sm:px-8">
      <div className="relative overflow-hidden rounded-md border border-violet-300/30 bg-[radial-gradient(circle_at_20%_20%,rgba(196,181,253,0.18),transparent_30%),linear-gradient(135deg,rgba(139,92,246,0.18),rgba(0,0,0,0.3)_55%)] p-5 sm:p-8">
        <div className="absolute right-6 top-6 hidden font-mono text-7xl tracking-[-0.08em] text-white/[0.035] lg:block">DEMO</div>
        <div className="relative grid gap-8 lg:grid-cols-[0.75fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Free public repo preview</p>
            <h2 className="mt-5 max-w-2xl font-mono text-3xl leading-tight tracking-[-0.05em] text-white sm:text-5xl">
              Show it a repo before you show it your email.
            </h2>
            <p className="mt-5 max-w-xl font-mono text-sm leading-7 text-zinc-300">
              Run CommitGlow against any public GitHub repository, get a markdown preview, and share the exact result URL with your team.
            </p>
          </div>
          <div className="rounded-sm border border-white/10 bg-black/40 p-4 font-mono">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              <span className="rounded-sm border border-violet-300/30 bg-violet-500/10 px-2 py-1 text-violet-100">No sign-up</span>
              <span>Public GitHub only</span>
              <span>5 demos / IP / hour</span>
            </div>
            <pre className="overflow-hidden pt-5 text-sm leading-7 text-zinc-300">{String.raw`repo: vercel/next.js
commits: 18 recent
output: shareable changelog preview`}</pre>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <AnchorButton href="/demo" variant="primary" className="group w-full sm:w-auto">
                <PromptIcon />
                <span>Try Public Demo</span>
                <ArrowRightIcon />
              </AnchorButton>
              <AnchorButton href="/demo?repo=vercel%2Fnext.js" className="group w-full sm:w-auto">
                <span>Open Example</span>
                <ArrowRightIcon />
              </AnchorButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader />
      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <HomepageGreeting />
          <h1 className="max-w-4xl font-mono text-4xl leading-[0.98] tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">
            Turn shipped commits into release-ready changelogs.
          </h1>
          <p className="mt-8 max-w-2xl font-mono text-base leading-8 text-zinc-400">
            Connect a repository, select the commits that matter, and let CommitGlow draft clean release notes with streamed AI generation and markdown output.
          </p>
          <HomepageCtaButtons />
          <a href="/demo" className="mt-5 w-fit font-mono text-xs uppercase tracking-[0.14em] text-violet-200 underline-offset-4 transition hover:text-white hover:underline">
            Try a public repo first, no account needed -&gt;
          </a>
          <div className="mt-8 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            <span className="rounded-sm border border-white/10 px-2.5 py-1.5">Repository sync</span>
            <span className="rounded-sm border border-white/10 px-2.5 py-1.5">Commit selection</span>
            <span className="rounded-sm border border-white/10 px-2.5 py-1.5">Markdown changelogs</span>
          </div>
        </div>
        <ReleasePipelinePreview />
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl border-t border-white/10 px-5 py-12 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr] lg:items-end">
          <div>
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Product workflow</p>
            <h2 className="font-mono text-3xl leading-tight tracking-[-0.05em] text-white sm:text-5xl">
              A release desk for every product.
            </h2>
          </div>
          <p className="max-w-2xl font-mono text-sm leading-7 text-zinc-400 lg:justify-self-end">
            CommitGlow is organized the way teams ship: workspaces hold projects, projects hold repositories, and repositories hold the commits that become release history.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-4">
          {capabilities.map(([icon, title, description]) => (
            <Card key={title} className="min-h-56 overflow-hidden">
              <div className="mb-8 grid h-11 w-11 place-items-center rounded-sm border border-violet-300/40 bg-violet-500/10 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.16)]">
                <ProductIcon name={icon} />
              </div>
              <h3 className="font-mono text-base text-white">{title}</h3>
              <div className="my-4 h-px w-8 bg-violet-300" />
              <p className="font-mono text-sm leading-7 text-zinc-400">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto w-full max-w-7xl border-t border-white/10 px-5 py-12 sm:px-8">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// How it works</p>
        <div className="grid overflow-hidden rounded-md border border-white/10 bg-black/20 md:grid-cols-4">
          {pipeline.map(([number, icon, title, description]) => (
            <div key={number} className="relative border-b border-white/10 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 md:border-white/10">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">{number}</span>
                <span className="grid h-9 w-9 place-items-center rounded-sm border border-white/10 bg-white/[0.025] text-violet-100">
                  <ProductIcon name={icon} />
                </span>
              </div>
              <h3 className="mt-8 font-mono text-lg text-white">{title}</h3>
              <p className="mt-4 font-mono text-sm leading-7 text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <MiniDemo />

      <PublicDemoBanner />

      <section className="mx-auto grid w-full max-w-7xl gap-8 border-t border-white/10 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1fr]">
        <div>
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Output formats</p>
          <h2 className="font-mono text-3xl leading-tight tracking-[-0.05em] text-white sm:text-5xl">
            Draft once.
            <br />
            Publish anywhere.
          </h2>
          <p className="mt-6 max-w-xl font-mono text-sm leading-7 text-zinc-400">
            Every generation produces markdown-first release copy that stays portable after it leaves CommitGlow.
          </p>
        </div>
        <div className="grid gap-4">
          {outputs.map(([icon, title, description], index) => (
            <Card key={title} className="group flex gap-5 hover:-translate-y-0.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-violet-300/30 bg-violet-500/10 text-violet-100">
                <ProductIcon name={icon} />
              </span>
              <div>
                <span className="font-mono text-xs text-violet-200">0{index + 1}</span>
                <h3 className="font-mono text-lg text-white">{title}</h3>
                <p className="mt-3 font-mono text-sm leading-7 text-zinc-400">{description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl border-t border-white/10 px-5 py-12 sm:px-8">
        <div className="rounded-md border border-violet-300/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_32%),rgba(139,92,246,0.06)] p-5 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Why it works</p>
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {proofPoints.map(([title, description]) => (
              <div key={title} className="border-l border-violet-300/30 pl-4">
                <h3 className="font-mono text-sm uppercase tracking-[0.14em] text-white">{title}</h3>
                <p className="mt-4 font-mono text-sm leading-7 text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto grid w-full max-w-7xl gap-10 border-t border-white/10 px-5 py-12 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Built for release work</p>
          <h2 className="mb-8 font-mono text-3xl leading-tight tracking-[-0.05em] text-white sm:text-5xl">
            Less release-writing.
            <br />
            More shipped product.
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <AnchorButton href="/pricing" variant="primary" className="group">
              <span>View Pricing</span>
              <ArrowRightIcon />
            </AnchorButton>
            <AnchorButton href="/auth/sign-up" className="group">
              <PromptIcon />
              <span>Start Free</span>
              <ArrowRightIcon />
            </AnchorButton>
          </div>
          <div className="mt-8 grid gap-2 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
            {pricingNotes.map((note) => <span key={note}>{note}</span>)}
          </div>
          <div className="mt-6 grid gap-2 font-mono text-xs leading-6 text-zinc-500">
            {billingPrinciples.slice(0, 3).map((principle) => <span key={principle}>// {principle}</span>)}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/30 p-5 font-mono text-sm text-zinc-300">
          <div className="border-b border-white/10 pb-4 text-zinc-500">$ commitglow generate --selected</div>
          <pre className="overflow-hidden pt-6 text-violet-200/80">{String.raw`repo: ultro/commitglow
branch: main
commits: 18 selected

status: drafting markdown
output: changelog saved`}</pre>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
