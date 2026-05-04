"use client";

import { AnchorButton } from "@commitglow/ui";
import { authClient } from "@/lib/auth-client";
import { plans, toPlanSlug, type PlanSlug } from "@/lib/plans";
import { PolarCheckoutButton } from "@/components/polar-checkout-button";
import type { PaidPlanSlug } from "@/lib/plans";

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

function useAuthState() {
  const { data: session, isPending } = authClient.useSession();
  const isAuthenticated = Boolean(session);
  const plan = (session?.user as Record<string, unknown> | undefined)?.plan;
  const activePlan = toPlanSlug(plan);
  return { session, isPending, isAuthenticated, activePlan };
}

export function HomepageGreeting() {
  const { session, isPending, isAuthenticated } = useAuthState();
  return (
    <p className="mb-8 w-fit rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
      {isPending || !isAuthenticated
        ? "// Made for developers"
        : `// Welcome back, ${session?.user.name ?? "developer"}`}
    </p>
  );
}

export function HomepageCtaButtons() {
  const { isPending, isAuthenticated } = useAuthState();
  const primaryHref = isPending || !isAuthenticated ? "/auth/sign-up" : "/dashboard";
  const primaryLabel = isPending || !isAuthenticated ? "Generate Notes" : "Open Dashboard";
  const secondaryHref = isPending || !isAuthenticated ? "#features" : "/dashboard/projects";
  const secondaryLabel = isPending || !isAuthenticated ? "View Example" : "Projects";
  const notice = isPending || !isAuthenticated
    ? "No sign up required for the preview."
    : "You are signed in. Continue where you left off.";

  return (
    <>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <AnchorButton href={primaryHref} variant="primary" className="group w-full sm:w-auto">
          <PromptIcon />
          <span>{primaryLabel}</span>
          <ArrowRightIcon />
        </AnchorButton>
        <AnchorButton href={secondaryHref} variant="secondary" className="group w-full bg-black/30 sm:w-auto">
          <span>{secondaryLabel}</span>
          <ArrowRightIcon />
        </AnchorButton>
      </div>
      <p className="mt-6 font-mono text-xs text-zinc-500">{notice}</p>
    </>
  );
}

export function PricingCurrentPlanBadge() {
  const { activePlan, isAuthenticated } = useAuthState();
  if (!isAuthenticated || !activePlan) return null;
  return (
    <p className="mx-auto mt-6 w-fit rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-100">
      Current plan: {plans[activePlan].label}
    </p>
  );
}

export function PricingTierCta({
  tierSlug,
  checkoutSlug,
  label,
  highlighted,
  polarConfigured,
}: {
  tierSlug: string;
  checkoutSlug?: string;
  label: string;
  highlighted: boolean;
  polarConfigured: boolean;
}) {
  const { isPending, isAuthenticated, activePlan, session } = useAuthState();
  const isCurrentPlan = activePlan === tierSlug;

  if (isPending) {
    return (
      <AnchorButton href="/auth/sign-up" variant={highlighted ? "primary" : "secondary"} className="group mt-8 w-full rounded-full hover:shadow-[0_0_28px_rgba(139,92,246,0.22)]">
        <span>Sign In To Upgrade</span>
        <ArrowRightIcon />
      </AnchorButton>
    );
  }

  if (isCurrentPlan) {
    return (
      <AnchorButton href="/dashboard/settings" variant="secondary" className="group mt-8 w-full rounded-full border-emerald-300/40 bg-emerald-500/10 text-emerald-50 hover:border-emerald-200 hover:bg-emerald-400/15">
        <span>Current Plan</span>
        <ArrowRightIcon />
      </AnchorButton>
    );
  }

  if (tierSlug === "free") {
    return (
      <AnchorButton href={isAuthenticated ? "/dashboard" : "/auth/sign-up"} variant="secondary" className="group mt-8 w-full rounded-full hover:shadow-[0_0_28px_rgba(139,92,246,0.22)]">
        <span>{label}</span>
        <ArrowRightIcon />
      </AnchorButton>
    );
  }

  if (!isAuthenticated) {
    return (
      <AnchorButton href="/auth/sign-up" variant={highlighted ? "primary" : "secondary"} className="group mt-8 w-full rounded-full hover:shadow-[0_0_28px_rgba(139,92,246,0.22)]">
        <span>Sign In To Upgrade</span>
        <ArrowRightIcon />
      </AnchorButton>
    );
  }

  if (!checkoutSlug || !polarConfigured) {
    return (
      <div className="mt-8 rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-center font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">
        Billing Unavailable
      </div>
    );
  }

  return (
    <PolarCheckoutButton slug={checkoutSlug as PaidPlanSlug} referenceId={session?.user.id} configured highlighted={highlighted}>
      {label}
    </PolarCheckoutButton>
  );
}
