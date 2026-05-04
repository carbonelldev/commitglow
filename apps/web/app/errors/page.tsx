import type { Metadata } from "next";
import { AnchorButton, Card } from "@commitglow/ui";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { httpStatusPages } from "@/lib/http-status-pages";

export const metadata: Metadata = {
  title: "HTTP Error Pages | CommitGlow",
  description: "Branded CommitGlow pages for common HTTP status codes.",
};

export default function ErrorPagesIndex() {
  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader />
      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="mb-8 w-fit rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
          // HTTP status pages
        </p>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-mono text-5xl leading-tight tracking-[-0.05em] text-white sm:text-6xl">
              Error states,
              <br />
              ready to support.
            </h1>
            <p className="mt-6 max-w-2xl font-mono text-base leading-8 text-zinc-400">
              Branded pages for common client and server HTTP codes, with recovery actions that route users back to stable CommitGlow flows.
            </p>
          </div>
          <AnchorButton href="/" variant="primary" className="w-full sm:w-auto">
            &gt;_ Go Home
          </AnchorButton>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {httpStatusPages.map((page) => (
            <a key={page.code} href={`/errors/${page.code}`} className="group block">
              <Card className="h-full">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-4xl text-white">{page.code}</span>
                  <span className="rounded-sm border border-violet-300/30 bg-violet-500/10 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-violet-200">
                    {page.code >= 500 ? "server" : "client"}
                  </span>
                </div>
                <h2 className="mt-8 font-mono text-base text-white">{page.title}</h2>
                <p className="mt-4 font-mono text-sm leading-7 text-zinc-400">{page.label}</p>
                <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-violet-200 transition group-hover:text-white">
                  Open page -&gt;
                </p>
              </Card>
            </a>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
