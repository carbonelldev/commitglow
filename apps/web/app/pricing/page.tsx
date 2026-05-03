import { AnchorButton, Card } from "@commitglow/ui";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const tiers = [
  {
    name: "Starter",
    price: "$0",
    cadence: "forever",
    description: "For solo builders who want clean release notes without a process meeting.",
    cta: "Start Free",
    highlighted: false,
    features: [
      "3 projects",
      "25 generations per month",
      "Release notes and changelogs",
      "Markdown export",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$10",
    cadence: "per month",
    description: "For solo developers and indie builders shipping updates every week.",
    cta: "Choose Pro",
    highlighted: true,
    features: [
      "Unlimited projects",
      "200 generations per month",
      "Launch posts and email copy",
      "Saved release history",
      "Custom tone presets",
      "Priority support",
    ],
  },
  {
    name: "Team",
    price: "$25+",
    cadence: "per month",
    description: "For teams that need shared release workflows with flexible usage as they grow.",
    cta: "Start Team",
    highlighted: false,
    features: [
      "Everything in Pro",
      "Base team workspace included",
      "Pay-as-you-go usage",
      "Shared project templates",
      "Approval-ready internal briefs",
      "Role-based access coming soon",
      "Private onboarding",
    ],
  },
];

const questions = [
  ["Can I use it for free?", "Yes. Starter is designed for trying CommitGlow and shipping small projects."],
  ["What counts as a generation?", "One generated release-note, changelog, post, or brief output from a change set."],
  ["Can I paste commits manually?", "Yes. The product is built around fast manual input first, with deeper repository integrations planned."],
  ["Is my content locked in?", "No. Outputs are markdown-first so you can copy them into GitHub, docs, email, or your own workflow."],
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-violet-200" fill="none" viewBox="0 0 16 16">
      <path d="m3 8 3 3 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 16 16">
      <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAuthenticated = Boolean(session);
  const actionHref = isAuthenticated ? "/dashboard" : "/auth/sign-up";

  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader isAuthenticated={isAuthenticated} />
      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="mb-8 w-fit rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
          // Pricing
        </p>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-end">
          <div>
            <h1 className="max-w-3xl font-mono text-5xl leading-tight tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              Pricing for teams that ship.
            </h1>
            <p className="mt-8 max-w-2xl font-mono text-base leading-8 text-zinc-400">
              Start free, then upgrade when release communication becomes part of your workflow.
              Every plan keeps outputs portable and developer-friendly.
            </p>
          </div>
          <Card className="bg-black/40">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Recommendation</p>
            <p className="mt-5 font-mono text-sm leading-7 text-zinc-300">
              Most solo builders should start with Pro: it keeps the monthly cost easy to justify
              while covering regular releases, saved history, and launch-ready copy.
            </p>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 border-t border-white/10 px-5 py-12 sm:px-8 lg:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={[
              "relative flex min-h-full flex-col",
              tier.highlighted ? "border-violet-300/60 bg-violet-500/[0.08] shadow-[0_0_42px_rgba(139,92,246,0.18)]" : "",
            ].filter(Boolean).join(" ")}
          >
            {tier.highlighted ? (
              <span className="absolute right-5 top-5 rounded-sm border border-violet-300/40 bg-violet-500/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-violet-100">
                Best Fit
              </span>
            ) : null}
            <h2 className="font-mono text-2xl text-white">{tier.name}</h2>
            <p className="mt-4 min-h-14 font-mono text-sm leading-7 text-zinc-400">{tier.description}</p>
            <div className="mt-8 flex items-end gap-3 font-mono">
              <span className="text-5xl tracking-[-0.08em] text-white">{tier.price}</span>
              <span className="pb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">{tier.cadence}</span>
            </div>
            <AnchorButton href={actionHref} variant={tier.highlighted ? "primary" : "secondary"} className="group mt-8 w-full">
              <span>{tier.cta}</span>
              <ArrowRightIcon />
            </AnchorButton>
            <div className="mt-8 h-px w-full bg-white/10" />
            <ul className="mt-8 space-y-4 font-mono text-sm leading-6 text-zinc-300">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <CheckIcon />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 border-t border-white/10 px-5 py-12 sm:px-8 lg:grid-cols-[0.65fr_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// FAQ</p>
          <h2 className="mt-6 font-mono text-4xl leading-tight tracking-[-0.05em] text-white">Simple by design.</h2>
        </div>
        <div className="grid gap-4">
          {questions.map(([question, answer]) => (
            <Card key={question}>
              <h3 className="font-mono text-base text-white">{question}</h3>
              <p className="mt-3 font-mono text-sm leading-7 text-zinc-400">{answer}</p>
            </Card>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
