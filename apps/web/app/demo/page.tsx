import type { Metadata } from "next";
import { Button, Input } from "@commitglow/ui";
import { DemoLivePreview } from "@/components/demo-live-preview";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { seo } from "@/lib/seo";

type SearchParams = Promise<{ repo?: string }>;

export const metadata: Metadata = {
  title: "Free Public Repository Demo | CommitGlow",
  description: "Try CommitGlow with a public Git repository before creating an account. Generate a shareable AI changelog preview from recent commits.",
  alternates: { canonical: `${seo.siteUrl}/demo` },
  openGraph: {
    title: "Free Public Repository Demo | CommitGlow",
    description: "Preview CommitGlow on public GitHub, GitLab, Bitbucket, and Gitea repositories without registration.",
    url: `${seo.siteUrl}/demo`,
  },
};

function DemoForm({ repo }: { repo: string }) {
  return (
    <form action="/demo" className="mx-auto mt-8 grid w-full max-w-3xl gap-3 rounded-md border border-violet-300/20 bg-black/45 p-3 shadow-[0_0_80px_rgba(139,92,246,0.12)] sm:grid-cols-[1fr_auto]">
      <label className="sr-only" htmlFor="repo">Public Git repository</label>
      <Input id="repo" name="repo" defaultValue={repo} placeholder="github.com/vercel/next.js or gitlab-org/gitlab" autoComplete="off" />
      <Button type="submit" variant="primary" className="w-full sm:w-auto">Generate Demo</Button>
    </form>
  );
}

export default async function DemoPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const repo = String(params.repo ?? "").trim().slice(0, 300);
  const shareHref = repo ? `${seo.siteUrl}/demo?repo=${encodeURIComponent(repo)}` : `${seo.siteUrl}/demo`;

  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader />
      <section className="relative mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-16">
        <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mx-auto mb-6 w-fit rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// public AI workbench</p>
          <h1 className="font-mono text-4xl leading-[0.96] tracking-[-0.08em] text-white sm:text-6xl">
            Generate the real demo from any public repo.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-mono text-sm leading-7 text-zinc-500">
            Paste a public repo URL. If the exact repo, branch, model, and commits are cached, we reuse it. Otherwise the AI stream starts live below.
          </p>
          <DemoForm repo={repo} />
          <div className="mt-5 flex flex-wrap justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            <span className="rounded-sm border border-white/10 px-2.5 py-1.5">GitHub</span>
            <span className="rounded-sm border border-white/10 px-2.5 py-1.5">GitLab</span>
            <span className="rounded-sm border border-white/10 px-2.5 py-1.5">Bitbucket</span>
            <span className="rounded-sm border border-white/10 px-2.5 py-1.5">Gitea URL</span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4 font-mono text-xs text-violet-200">
            <a href="/demo?repo=github%3Avercel%2Fnext.js" className="underline-offset-4 hover:underline">Try Next.js</a>
            <a href="/demo?repo=gitlab%3Agitlab-org%2Fgitlab" className="underline-offset-4 hover:underline">Try GitLab</a>
          </div>
        </div>
        <div className="relative mt-10">
          <DemoLivePreview repoInput={repo} shareHref={shareHref} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
