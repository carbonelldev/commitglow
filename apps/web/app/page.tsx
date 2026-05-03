import { AnchorButton, Card } from "@commitglow/ui";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TerminalPreview } from "@/components/terminal-preview";

const features = [
  ["Release Notes", "Clean, structured, and ready to ship."],
  ["Changelog", "Keep a consistent history of changes."],
  ["Social Posts", "Launch your updates with a tweet or post."],
  ["Email Updates", "Notify your users with style."],
  ["CLI Coming Soon", "Generate from your terminal."],
];

const outputs = [
  ["Product Update", "A polished summary for users, customers, and launch posts."],
  ["Technical Changelog", "Grouped commits with context, scope, and clean markdown."],
  ["Internal Brief", "A fast handoff for support, sales, and async standups."],
];

const signals = [
  ["Diff-aware", "Understands what changed instead of rewriting commit messages."],
  ["Markdown-first", "Exports clean copy you can paste into docs, GitHub, or email."],
  ["Team-ready", "Keep projects, release history, and generated outputs together."],
  ["Open-source core", "Built for developer workflows without locking up your content."],
];

const steps = [
  ["01", "Connect or Paste", "Connect your repo or paste your commits."],
  [
    "02",
    "We Analyze",
    "CommitGlow reads your changes and understands context.",
  ],
  [
    "03",
    "Get Beautiful Output",
    "Release notes, changelog, and posts. Ready to go.",
  ],
];

function PromptIcon() {
  return (
    <span aria-hidden="true" className="font-mono text-violet-100">
      &gt;_
    </span>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M3 8h10m0 0L9 4m4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAuthenticated = Boolean(session);

  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader isAuthenticated={isAuthenticated} />
      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <p className="mb-8 w-fit rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
            {isAuthenticated ? `// Welcome back, ${session?.user.name ?? "developer"}` : "// Made for developers"}
          </p>
          <h1 className="max-w-3xl font-mono text-5xl leading-tight tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
            Ship more.
            <br />
            Document better.
            <span className="cursor-blink ml-3 inline-block h-12 w-4 translate-y-2 bg-violet-400 sm:h-16" />
          </h1>
          <p className="mt-8 max-w-2xl font-mono text-base leading-8 text-zinc-400">
            CommitGlow turns your commits and changes into clean release notes,
            changelogs, and launch posts. Built for devs who ship.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <AnchorButton href={isAuthenticated ? "/dashboard" : "/auth/sign-up"} variant="primary" className="group w-full sm:w-auto">
              <PromptIcon />
              <span>{isAuthenticated ? "Open Dashboard" : "Generate Notes"}</span>
              <ArrowRightIcon />
            </AnchorButton>
            <AnchorButton
              href={isAuthenticated ? "/dashboard/projects" : "#features"}
              variant="secondary"
              className="group w-full bg-black/30 sm:w-auto"
            >
              <span>{isAuthenticated ? "Projects" : "View Example"}</span>
              <ArrowRightIcon />
            </AnchorButton>
          </div>
          <p className="mt-6 font-mono text-xs text-zinc-500">
            {isAuthenticated ? "You are signed in. Continue where you left off." : "No sign up required for the preview."}
          </p>
        </div>
        <TerminalPreview />
      </section>
      <section
        id="features"
        className="mx-auto w-full max-w-7xl border-t border-white/10 px-5 py-12 sm:px-8"
      >
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
          // What you get
        </p>
        <div className="grid gap-5 md:grid-cols-5">
          {features.map(([title, description]) => (
            <Card key={title} className="min-h-48">
              <div className="mb-8 font-mono text-3xl text-white">
                {title === "Social Posts"
                  ? "#"
                  : title === "CLI Coming Soon"
                    ? ">&_"
                    : "<>"}
              </div>
              <h2 className="font-mono text-base text-white">{title}</h2>
              <div className="my-4 h-px w-7 bg-violet-300" />
              <p className="font-mono text-sm leading-7 text-zinc-400">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </section>
      <section
        id="how"
        className="mx-auto w-full max-w-7xl border-t border-white/10 px-5 py-12 sm:px-8"
      >
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
          // How it works
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map(([number, title, description]) => (
            <div key={number} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center border border-violet-300/50 bg-violet-500/10 font-mono text-violet-200">
                {number}
              </span>
              <h3 className="mt-6 font-mono text-lg text-white">{title}</h3>
              <p className="mx-auto mt-4 max-w-xs font-mono text-sm leading-7 text-zinc-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto grid w-full max-w-7xl gap-8 border-t border-white/10 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1fr]">
        <div>
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
            // Output formats
          </p>
          <h2 className="font-mono text-4xl leading-tight tracking-[-0.05em] text-white sm:text-5xl">
            One change set.
            <br />
            Multiple launch assets.
          </h2>
          <p className="mt-6 max-w-xl font-mono text-sm leading-7 text-zinc-400">
            Turn a messy batch of commits into the exact copy your release needs:
            user-facing notes, technical logs, and internal summaries.
          </p>
        </div>
        <div className="grid gap-4">
          {outputs.map(([title, description], index) => (
            <Card key={title} className="flex gap-5">
              <span className="font-mono text-sm text-violet-200">0{index + 1}</span>
              <div>
                <h3 className="font-mono text-lg text-white">{title}</h3>
                <p className="mt-3 font-mono text-sm leading-7 text-zinc-400">{description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
      <section className="mx-auto w-full max-w-7xl border-t border-white/10 px-5 py-12 sm:px-8">
        <div className="rounded-md border border-violet-300/20 bg-violet-500/[0.06] p-5 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
            // Why it works
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {signals.map(([title, description]) => (
              <div key={title} className="border-l border-violet-300/30 pl-4">
                <h3 className="font-mono text-sm uppercase tracking-[0.14em] text-white">{title}</h3>
                <p className="mt-4 font-mono text-sm leading-7 text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        id="pricing"
        className="mx-auto grid w-full max-w-7xl gap-10 border-t border-white/10 px-5 py-12 sm:px-8 lg:grid-cols-2"
      >
        <div>
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
            // Built for developers
          </p>
          <h2 className="font-mono text-4xl leading-tight tracking-[-0.05em] text-white sm:text-5xl mb-8">
            Less writing.
            <br />
            More shipping.
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row">
          <AnchorButton href="/pricing" variant="primary" className="group">
            <span>View Pricing</span>
            <ArrowRightIcon />
          </AnchorButton>
          <AnchorButton href={isAuthenticated ? "/dashboard" : "/auth/sign-up"} className="group">
            <PromptIcon />
            <span>{isAuthenticated ? "Dashboard" : "Get Started"}</span>
            <ArrowRightIcon />
          </AnchorButton>
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/30 p-5 font-mono text-sm text-zinc-300">
          <div className="border-b border-white/10 pb-4 text-zinc-500">
            $ ship it
          </div>
          <pre className="overflow-hidden pt-6 text-violet-200/80">{String.raw`          .::.
       .::::::::.
    .::::::  ::::::.
 .:::::        :::::.
::::     glow     ::::
 '::::.        .::::'
    '::::::::::::'
       '::::::'`}</pre>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
