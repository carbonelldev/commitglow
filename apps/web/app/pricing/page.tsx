import type { Metadata } from "next";
import { Card } from "@commitglow/ui";
import { planList } from "@/lib/plans";
import { isPolarCheckoutConfigured } from "@/lib/polar-billing";
import type { PaidPlanSlug } from "@/lib/plans";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PricingCurrentPlanBadge, PricingTierCta } from "@/components/auth-aware-cta";
import { FAQPageJsonLd } from "@/components/json-ld";
import { seo } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing — AI Changelog & Release Notes Plans | CommitGlow",
  description: "Start free, upgrade when CommitGlow becomes part of how you ship. Compare Starter, Pro, and Team plans for AI release notes, changelogs, and launch posts.",
  alternates: {
    canonical: `${seo.siteUrl}/pricing`,
  },
  openGraph: {
    title: "Pricing — AI Changelog & Release Notes Plans | CommitGlow",
    description: "Start free, upgrade when CommitGlow becomes part of how you ship. Compare Starter, Pro, and Team plans.",
    url: `${seo.siteUrl}/pricing`,
  },
  twitter: {
    title: "Pricing — AI Changelog & Release Notes Plans | CommitGlow",
    description: "Start free, upgrade when CommitGlow becomes part of how you ship.",
  },
};

const questions = [
  ["Can I use it for free?", "Yes. Starter is designed for trying CommitGlow and shipping small projects."],
  ["What counts as a generation?", "One generated release-note, changelog, post, or brief output from a change set."],
  ["Will I get surprise overage charges?", "No on Starter and Pro. Team only meters generations beyond the included monthly amount, and the per-generation price is shown before checkout."],
  ["How does Team usage billing work?", "Team has a monthly base price, includes a monthly generation allowance, then bills only additional generations at the listed metered rate."],
  ["Is my account a workspace?", "Yes. Every signed-in account starts as a personal workspace. There is no separate user workspace concept in the product UI."],
  ["Can I create multiple workspaces?", "Yes. Starter includes up to 2 workspaces total so you can separate personal and product work. Paid plans will unlock more."],
  ["Can I connect multiple Git accounts?", "The schema supports multiple provider accounts per workspace, including GitHub, GitLab, and Bitbucket. Paid limits will gate that once connection UI ships."],
  ["Can I paste commits manually?", "Yes. The product is built around fast manual input first, with deeper repository integrations planned."],
  ["Is my content locked in?", "No. Outputs are markdown-first so you can copy them into GitHub, docs, email, or your own workflow."],
];

const faqSchemaItems = questions.map(([question, answer]) => ({
  question,
  answer,
}));

const comparisonRows = [
  ["Monthly generations", "25", "200", "1,000 included, then metered"],
  ["Automatic overage billing", "No", "No", "$0.01 per extra generation"],
  ["Workspaces", "2", "5", "Unlimited"],
  ["Projects", "3 per workspace", "Unlimited", "Unlimited"],
  ["Connected Git accounts", "1", "5", "Unlimited"],
  ["Best output fit", "Release notes", "Launch posts + email", "Internal briefs + approvals"],
] as const;

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-violet-200" fill="none" viewBox="0 0 16 16">
      <path d="m3 8 3 3 7-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

const tierData = planList.map((tier) => {
  const checkoutSlug = "checkoutSlug" in tier ? (tier.checkoutSlug as PaidPlanSlug | undefined) : undefined;
  const polarConfigured = checkoutSlug ? isPolarCheckoutConfigured(checkoutSlug) : false;
  return { tier, checkoutSlug, polarConfigured };
});

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <FAQPageJsonLd items={faqSchemaItems} />
      <SiteHeader />
      <section className="mx-auto w-full max-w-7xl px-5 pt-16 sm:px-8 lg:pt-24">
        <div className="border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:128px_72px] px-5 py-20 text-center sm:px-8 lg:py-28">
          <h1 className="mx-auto max-w-4xl font-mono text-3xl leading-tight tracking-[-0.06em] text-white sm:text-6xl">
            Find a plan for every release workflow.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-mono text-sm leading-7 text-zinc-400 sm:text-base">
            Start free. Upgrade when CommitGlow becomes part of how you ship.
          </p>
          <PricingCurrentPlanBadge />
        </div>
      </section>

      <section id="plans" className="mx-auto grid w-full max-w-7xl overflow-hidden border-x border-b border-white/10 bg-black/20 divide-y divide-white/10 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {tierData.map(({ tier, checkoutSlug, polarConfigured }) => (
          <Card
            key={tier.slug}
            className={[
              "group relative flex min-h-full flex-col rounded-none border-0 bg-black/20 p-7 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.045] hover:shadow-[0_24px_80px_rgba(139,92,246,0.16)] hover:ring-1 hover:ring-violet-300/35 sm:p-8",
              tier.highlighted ? "bg-white/[0.035]" : "",
            ].filter(Boolean).join(" ")}
          >
            <div className="absolute right-7 top-0 flex flex-wrap justify-end gap-2">
              {tier.highlighted ? (
                <span className="rounded-b-sm bg-white px-3 py-1.5 font-mono text-[10px] text-black">
                  Popular
                </span>
              ) : null}
            </div>
            <div className="pt-8 font-mono">
              <h2 className="text-2xl text-white transition-colors duration-300 group-hover:text-violet-100">{tier.label}</h2>
              <p className="mt-4 min-h-16 text-sm leading-7 text-zinc-400 transition-colors duration-300 group-hover:text-zinc-300">{tier.description}</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold tracking-[-0.06em] text-white transition-transform duration-300 group-hover:scale-105">{tier.price}</span>
                <span className="pb-1 text-sm text-zinc-400">{tier.cadence}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">{tier.includedGenerations} generations included</p>
            </div>
            <PricingTierCta
              tierSlug={tier.slug}
              checkoutSlug={checkoutSlug}
              label={tier.cta}
              highlighted={tier.highlighted}
              polarConfigured={polarConfigured}
            />
            <ul className="mt-8 space-y-4 font-mono text-sm leading-6 text-zinc-300">
              {tier.features.slice(0, 7).map((feature) => (
                <li key={feature} className="flex gap-3">
                  <CheckIcon />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl border-x border-b border-white/10 px-5 sm:px-8 lg:px-0">
        <div className="border-b border-white/10 p-6 text-center sm:p-8">
          <h2 className="font-mono text-2xl tracking-[-0.04em] text-white">Compare plans</h2>
        </div>
        <Card className="overflow-x-auto rounded-none border-0 bg-black/20 p-0">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-4 border-b border-white/10 font-mono text-sm text-zinc-400">
              <div className="p-5 text-center">Features</div>
              <div className="p-5 text-center text-white">Starter</div>
              <div className="p-5 text-center text-white">Pro</div>
              <div className="p-5 text-center text-white">Team</div>
            </div>
            {comparisonRows.map(([feature, starter, pro, team]) => (
              <div key={feature} className="grid grid-cols-4 border-b border-white/10 font-mono text-xs leading-5 last:border-b-0 sm:text-sm">
                <div className="p-5 text-center font-semibold text-zinc-300">{feature}</div>
                <div className="p-5 text-center text-zinc-400">{starter}</div>
                <div className="p-5 text-center text-zinc-100">{pro}</div>
                <div className="p-5 text-center text-zinc-400">{team}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 border-x border-b border-white/10 px-5 py-12 sm:px-8 lg:grid-cols-[0.65fr_1fr]">
        <div>
          <h2 className="font-mono text-3xl leading-tight tracking-[-0.05em] text-white sm:text-4xl">Frequently asked questions.</h2>
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
