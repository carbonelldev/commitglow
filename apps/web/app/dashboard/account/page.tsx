import { getSettingsSnapshot } from "@/app/dashboard/settings/actions";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { BillingPortalButton } from "@/components/billing-portal-button";
import { env } from "@/lib/env";
import { plans, toPlanSlug } from "@/lib/plans";
import { AnchorButton, Card } from "@commitglow/ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const snapshot = await getSettingsSnapshot();

  if (!snapshot) {
    redirect("/auth/sign-in");
  }

  const activePlan = toPlanSlug(snapshot.user.plan);
  const plan = plans[activePlan];
  const isFree = activePlan === "free";
  const polarConfigured = Boolean(env.polarAccessToken);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,0.24),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_42%,rgba(0,0,0,0.24))] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.35)] md:p-8">
        <div className="absolute right-8 top-8 hidden h-24 w-24 rounded-full border border-violet-200/20 bg-violet-400/10 blur-2xl md:block" />
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Account</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-mono text-3xl text-white sm:text-4xl md:text-5xl">Account settings</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">Manage your identity, billing plan, and account-level CommitGlow preferences.</p>
          </div>
          <AnchorButton href="/pricing" variant={isFree ? "primary" : "secondary"} className="w-full sm:w-auto">
            {isFree ? "Upgrade Plan" : "View Plan Options"}
          </AnchorButton>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="p-0 hover:border-white/10">
          <div className="border-b border-white/10 p-6">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">Identity</p>
            <h2 className="mt-2 font-mono text-2xl text-white">Profile</h2>
          </div>
          <div className="p-6">
            <AccountSettingsForm name={snapshot.user.name} email={snapshot.user.email} />
          </div>
        </Card>

        <Card className="relative overflow-hidden p-0 hover:border-violet-300/40">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/70 to-transparent" />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">Current plan</p>
                <h2 className={`mt-2 font-mono text-3xl ${plan.tone}`}>{plan.label}</h2>
              </div>
              <span className="rounded-sm border border-violet-200/30 bg-violet-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-violet-100">{activePlan}</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-zinc-400">{plan.description}</p>
            <p className="mt-3 rounded-sm border border-white/10 bg-white/[0.02] p-3 text-sm leading-6 text-zinc-300">{plan.billingSummary}</p>
            <div className="mt-6 rounded-sm border border-white/10 bg-black/30 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">Account allowance</p>
              <p className="mt-2 font-mono text-lg text-white">{plan.allowance}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Includes {plan.includedGenerations} generations per month{plan.overagePriceUsd === null ? "." : `, then $${plan.overagePriceUsd.toFixed(2)} per extra generation.`}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{plan.billingDisclosure}</p>
            </div>
            {!isFree ? <BillingPortalButton configured={polarConfigured} /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
