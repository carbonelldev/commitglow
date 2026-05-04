import { AnchorButton, Card } from "@commitglow/ui";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getStatusActionHref, type HttpStatusPage } from "@/lib/http-status-pages";

export async function HttpStatusScreen({ page }: { page: HttpStatusPage }) {
  const digits = String(page.code).split("");

  return (
    <main className="flex min-h-screen flex-col overflow-hidden">
      <SiteHeader />
      <section className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
        <div>
          <p className="mb-8 w-fit rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
            // HTTP {page.code} / {page.label}
          </p>
          <h1 className="max-w-3xl font-mono text-5xl leading-tight tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
            {page.title}
            <span className="cursor-blink ml-3 inline-block h-12 w-4 translate-y-2 bg-violet-400 sm:h-16" />
          </h1>
          <p className="mt-8 max-w-2xl font-mono text-base leading-8 text-zinc-400">
            {page.message}
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <AnchorButton href={getStatusActionHref(page.code)} variant="primary" className="w-full sm:w-auto">
              <span>&gt;_</span>
              <span>{page.action}</span>
            </AnchorButton>
            <AnchorButton href="/errors" variant="secondary" className="w-full bg-black/30 sm:w-auto">
              Error Index
            </AnchorButton>
          </div>
        </div>
        <Card className="relative min-h-[24rem] overflow-hidden p-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.26),transparent_28rem)]" />
          <div className="relative flex min-h-[24rem] flex-col justify-between p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-5 font-mono text-xs uppercase tracking-[0.16em] text-zinc-400">
              <span>status.panel</span>
              <span>{page.code >= 500 ? "server" : "client"}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 py-10 sm:gap-5">
              {digits.map((digit, index) => (
                <div key={`${digit}-${index}`} className="flex aspect-square items-center justify-center rounded-md border border-violet-300/30 bg-violet-500/[0.08] font-mono text-6xl text-white shadow-[0_0_40px_rgba(139,92,246,0.12)] sm:text-7xl">
                  {digit}
                </div>
              ))}
            </div>
            <div className="rounded-sm border border-white/10 bg-black/40 p-4 font-mono text-sm leading-7 text-zinc-400">
              <span className="text-violet-200">response</span>: {page.title.toLowerCase()}<br />
              <span className="text-violet-200">next</span>: follow the recovery action or return to a stable route
            </div>
          </div>
        </Card>
      </section>
      <SiteFooter />
    </main>
  );
}
