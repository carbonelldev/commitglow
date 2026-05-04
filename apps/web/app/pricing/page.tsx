import { AnchorButton, Card } from "@commitglow/ui";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { planList, plans, toPlanSlug } from "@/lib/plans";
import { isPolarCheckoutConfigured } from "@/lib/polar-billing";
import { PolarCheckoutButton } from "@/components/polar-checkout-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

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

const comparisonRows = [
  ["Monthly generations", "25", "200", "500 included, then metered"],
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
  const activePlan = session ? toPlanSlug(session.user.plan) : undefined;

  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader isAuthenticated={isAuthenticated} />
      <section className="mx-auto w-full max-w-7xl px-5 pt-16 sm:px-8 lg:pt-24">
        <div className="border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:128px_72px] px-5 py-20 text-center sm:px-8 lg:py-28">
          <h1 className="mx-auto max-w-4xl font-mono text-4xl leading-tight tracking-[-0.06em] text-white sm:text-6xl">
            Find a plan for every release workflow.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-mono text-sm leading-7 text-zinc-400 sm:text-base">
            Start free. Upgrade when CommitGlow becomes part of how you ship.
          </p>
          {session && activePlan ? (
            <p className="mx-auto mt-6 w-fit rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-100">
              Current plan: {plans[activePlan].label}
            </p>
          ) : null}
        </div>
      </section>

      <section id="plans" className="mx-auto grid w-full max-w-7xl overflow-hidden border-x border-b border-white/10 bg-black/20 divide-y divide-white/10 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {planList.map((tier) => {
          const isCurrentPlan = activePlan === tier.slug;
          const checkoutSlug = "checkoutSlug" in tier ? tier.checkoutSlug : undefined;
          const polarConfigured = checkoutSlug ? isPolarCheckoutConfigured(checkoutSlug) : false;

          return (
            <Card
              key={tier.slug}
              className={[
                "group relative flex min-h-full flex-col rounded-none border-0 bg-black/20 p-7 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.045] hover:shadow-[0_24px_80px_rgba(139,92,246,0.16)] hover:ring-1 hover:ring-violet-300/35 sm:p-8",
                tier.highlighted ? "bg-white/[0.035]" : "",
                isCurrentPlan ? "bg-emerald-500/[0.055] shadow-[0_0_42px_rgba(16,185,129,0.14)] hover:shadow-[0_24px_80px_rgba(16,185,129,0.16)] hover:ring-emerald-300/40" : "",
              ].filter(Boolean).join(" ")}
            >
              <div className="absolute right-7 top-0 flex flex-wrap justify-end gap-2">
                {isCurrentPlan ? (
                  <span className="rounded-sm border border-emerald-300/40 bg-emerald-500/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-100">
                    Current Plan
                  </span>
                ) : null}
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
              {isCurrentPlan ? (
                <AnchorButton href="/dashboard/settings" variant="secondary" className="group mt-8 w-full rounded-full border-emerald-300/40 bg-emerald-500/10 text-emerald-50 hover:border-emerald-200 hover:bg-emerald-400/15">
                  <span>Current Plan</span>
                  <ArrowRightIcon />
                </AnchorButton>
              ) : tier.slug === "free" || !isAuthenticated || !checkoutSlug ? (
                <AnchorButton href={actionHref} variant={tier.highlighted ? "primary" : "secondary"} className="group mt-8 w-full rounded-full hover:shadow-[0_0_28px_rgba(139,92,246,0.22)]">
                  <span>{tier.slug === "free" ? tier.cta : "Sign In To Upgrade"}</span>
                  <ArrowRightIcon />
                </AnchorButton>
              ) : !polarConfigured ? (
                <div className="mt-8 rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-center font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
                  Billing Unavailable
                </div>
              ) : (
                <PolarCheckoutButton slug={checkoutSlug} referenceId={session?.user.id} configured={polarConfigured} highlighted={tier.highlighted}>
                  {tier.cta}
                </PolarCheckoutButton>
              )}
              <ul className="mt-8 space-y-4 font-mono text-sm leading-6 text-zinc-300">
                {tier.features.slice(0, 7).map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
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
          <h2 className="font-mono text-4xl leading-tight tracking-[-0.05em] text-white">Frequently asked questions.</h2>
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
