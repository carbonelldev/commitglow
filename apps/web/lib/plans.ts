export const planSlugs = ["free", "pro", "team"] as const;

export type PlanSlug = (typeof planSlugs)[number];

export type PaidPlanSlug = Exclude<PlanSlug, "free">;

export type PlanConfig = {
  slug: PlanSlug;
  checkoutSlug?: PaidPlanSlug;
  polarProductEnv?: "POLAR_PRO_PRODUCT_ID" | "POLAR_TEAM_PRODUCT_ID";
  label: string;
  price: string;
  cadence: string;
  description: string;
  cta: string;
  highlighted: boolean;
  tone: string;
  allowance: string;
  workspaceLimit: number | null;
  projectLimit: number | null;
  providerAccountLimit: number | null;
  includedGenerations: number;
  overagePriceUsd: number | null;
  billingSummary: string;
  billingDisclosure: string;
  features: string[];
  unlocked: string[];
  next: string[];
};

export const meteredUsageConfig = {
  eventName: "commitglow-usage",
  quantityKey: "units",
  billablePlan: "team",
  unitLabel: "generation",
  teamIncludedGenerations: 1000,
  teamOveragePriceUsd: 0.01,
} as const;

export const plans = {
  free: {
    slug: "free",
    label: "Starter",
    price: "$0",
    cadence: "forever",
    description:
      "For solo builders trying CommitGlow or shipping small projects.",
    cta: "Start free",
    highlighted: false,
    tone: "text-zinc-300",
    allowance: "2 workspaces",
    workspaceLimit: 2,
    projectLimit: 3,
    providerAccountLimit: 1,
    includedGenerations: 25,
    overagePriceUsd: null,
    billingSummary:
      "Free forever. Includes 25 generations each month with no automatic overage billing.",
    billingDisclosure:
      "When you reach the included monthly generations, generation is paused until the next cycle or you upgrade.",
    features: [
      "3 projects per workspace",
      "Up to 2 workspaces",
      "1 Git provider account",
      "25 generations per month",
      "Release notes and changelogs",
      "Markdown export",
      "Community support",
    ],
    unlocked: ["Markdown exports", "Manual commit paste", "2 workspaces"],
    next: ["More workspaces", "Team collaboration", "Repository automation"],
  },
  pro: {
    slug: "pro",
    checkoutSlug: "pro",
    polarProductEnv: "POLAR_PRO_PRODUCT_ID",
    label: "Pro",
    price: "$5",
    cadence: "per month",
    description:
      "For indie developers and solo founders shipping updates every week.",
    cta: "Upgrade to Pro",
    highlighted: true,
    tone: "text-violet-100",
    allowance: "5 workspaces",
    workspaceLimit: 5,
    projectLimit: null,
    providerAccountLimit: 5,
    includedGenerations: 300,
    overagePriceUsd: null,
    billingSummary:
      "Flat $5/month. Includes 300 generations each month with no automatic overage billing.",
    billingDisclosure:
      "When you reach the included monthly generations, generation is paused until the next cycle or you upgrade to Team.",
    features: [
      "Unlimited projects",
      "Up to 5 workspaces",
      "Multiple GitHub/GitLab accounts",
      "300 generations per month",
      "Launch posts and email copy",
      "Saved release history",
      "Custom tone presets",
      "Priority support",
    ],
    unlocked: [
      "Everything in Starter",
      "More workspaces",
      "Priority generation",
    ],
    next: [
      "Shared team billing",
      "Advanced permissions",
      "Team usage visibility",
    ],
  },
  team: {
    slug: "team",
    checkoutSlug: "team",
    polarProductEnv: "POLAR_TEAM_PRODUCT_ID",
    label: "Team",
    price: "From $15",
    cadence: "per month",
    description:
      "For teams and agencies that need shared release workflows with flexible usage.",
    cta: "Start Team",
    highlighted: false,
    tone: "text-emerald-100",
    allowance: `${meteredUsageConfig.teamIncludedGenerations} included generations + metered overage`,
    workspaceLimit: null,
    projectLimit: null,
    providerAccountLimit: null,
    includedGenerations: meteredUsageConfig.teamIncludedGenerations,
    overagePriceUsd: meteredUsageConfig.teamOveragePriceUsd,
    billingSummary: `Base $15/month. Includes ${meteredUsageConfig.teamIncludedGenerations} generations, then $${meteredUsageConfig.teamOveragePriceUsd.toFixed(2)} per additional generation.`,
    billingDisclosure:
      "Extra generations are billed only after your included monthly allowance.",
    features: [
      "Everything in Pro",
      "Base team workspace included",
      "Unlimited projects",
      "Unlimited connected provider accounts",
      "Unlimited workspaces",
      `${meteredUsageConfig.teamIncludedGenerations} included generations per month`,
      `$${meteredUsageConfig.teamOveragePriceUsd.toFixed(2)} per extra generation`,
      "Shared project templates",
      "Shared release history",
      "Team tones/templates",
    ],
    unlocked: ["Everything in Pro", "Team seats", "Workspace governance"],
    next: ["Custom workflows", "Deeper audit trails", "Dedicated support"],
  },
} as const satisfies Record<PlanSlug, PlanConfig>;

export const planList = planSlugs.map((slug) => plans[slug]);

export const paidPlanList = planList.filter(
  (plan): plan is (typeof plans)[PaidPlanSlug] => plan.slug !== "free",
);

export function getPlan(slug: PlanSlug) {
  return plans[slug];
}

export function toPlanSlug(value: unknown): PlanSlug {
  return typeof value === "string" && planSlugs.includes(value as PlanSlug)
    ? (value as PlanSlug)
    : "free";
}

export function getWorkspaceLimit(slug: PlanSlug) {
  return plans[slug].workspaceLimit;
}

export function getProjectLimit(slug: PlanSlug) {
  return plans[slug].projectLimit;
}

export function formatWorkspaceLimit(slug: PlanSlug) {
  const limit = getWorkspaceLimit(slug);

  return limit === null ? "Unlimited" : String(limit);
}

export function getProviderAccountLimit(slug: PlanSlug) {
  return plans[slug].providerAccountLimit;
}

export function formatProjectLimit(slug: PlanSlug) {
  const limit = getProjectLimit(slug);

  return limit === null ? "Unlimited" : String(limit);
}

export const billingPrinciples = [
  "Starter and Pro never create automatic overage charges.",
  `Team includes ${meteredUsageConfig.teamIncludedGenerations} generations per month before metered usage starts.`,
  `Extra Team generations are $${meteredUsageConfig.teamOveragePriceUsd.toFixed(2)} each, billed only after the included monthly allowance.`,
  "A generation is one generated release note, changelog, launch post, email update, or update card.",
] as const;

export function formatProviderAccountLimit(slug: PlanSlug) {
  const limit = getProviderAccountLimit(slug);

  return limit === null ? "Unlimited" : String(limit);
}
