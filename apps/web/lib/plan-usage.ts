import { db } from "@/lib/db";
import { plans, toPlanSlug, type PlanSlug } from "@/lib/plans";
import { changelogs, integrations, organizations, projects, repositories, usageEvents } from "@commitglow/db/schema";
import { and, count, eq, gte, sum } from "drizzle-orm";

type UsageUser = {
  id: string;
  plan?: unknown;
};

type UsageOrganization = {
  id: string;
};

export type PlanLimitUsage = {
  used: number;
  limit: number | null;
  remaining: number | null;
  reached: boolean;
  hardLimit: boolean;
  label: string;
  remainingLabel: string;
};

export type PlanUsageSnapshot = {
  planSlug: PlanSlug;
  planLabel: string;
  resetAt: Date;
  generations: PlanLimitUsage & {
    included: number;
    overagePriceUsd: number | null;
    canGenerate: boolean;
  };
  workspaces: PlanLimitUsage;
  projects: PlanLimitUsage;
  providerAccounts: PlanLimitUsage;
  repositories: {
    used: number;
    label: string;
  };
  changelogs: {
    used: number;
    label: string;
  };
};

function getMonthStart() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  return monthStart;
}

export function getNextMonthStart(from = new Date()) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
}

function formatLimit(used: number, limit: number | null) {
  return limit === null ? `${used.toLocaleString("en-US")} / Unlimited` : `${used.toLocaleString("en-US")} / ${limit.toLocaleString("en-US")}`;
}

function formatRemaining(remaining: number | null, unit: string) {
  if (remaining === null) {
    return `Unlimited ${unit}`;
  }

  return `${remaining.toLocaleString("en-US")} ${unit} left`;
}

function createLimitUsage({ used, limit, hardLimit, unit }: { used: number; limit: number | null; hardLimit: boolean; unit: string }): PlanLimitUsage {
  const remaining = limit === null ? null : Math.max(limit - used, 0);

  return {
    used,
    limit,
    remaining,
    reached: limit !== null && used >= limit,
    hardLimit,
    label: formatLimit(used, limit),
    remainingLabel: formatRemaining(remaining, unit),
  };
}

function isExplicitProviderConnection(metadata: unknown) {
  return Boolean(metadata && typeof metadata === "object" && (metadata as Record<string, unknown>).source === "explicit-provider-connect");
}

export async function getPlanUsageSnapshot(user: UsageUser, organization: UsageOrganization): Promise<PlanUsageSnapshot> {
  const planSlug = toPlanSlug(user.plan);
  const plan = plans[planSlug];
  const monthStart = getMonthStart();
  const [generationUsage, ownedWorkspaceCount, workspaceProjectCount, workspaceRepositoryCount, workspaceChangelogCount] = await Promise.all([
    db
      .select({ quantity: sum(usageEvents.quantity) })
      .from(usageEvents)
      .where(and(eq(usageEvents.userId, user.id), eq(usageEvents.type, "generation"), gte(usageEvents.createdAt, monthStart))),
    db.select({ value: count() }).from(organizations).where(eq(organizations.ownerId, user.id)),
    db.select({ value: count() }).from(projects).where(eq(projects.organizationId, organization.id)),
    db
      .select({ value: count() })
      .from(repositories)
      .innerJoin(projects, eq(repositories.projectId, projects.id))
      .where(eq(projects.organizationId, organization.id)),
    db
      .select({ value: count() })
      .from(changelogs)
      .innerJoin(projects, eq(changelogs.projectId, projects.id))
      .where(eq(projects.organizationId, organization.id)),
  ]);
  const workspaceProviders = await db.select({ metadata: integrations.metadata }).from(integrations).where(eq(integrations.organizationId, organization.id));
  const generationUsed = Number(generationUsage[0]?.quantity ?? 0);
  const generationHardLimit = plan.overagePriceUsd === null;
  const generations = createLimitUsage({ used: generationUsed, limit: plan.includedGenerations, hardLimit: generationHardLimit, unit: "generations" });

  return {
    planSlug,
    planLabel: plan.label,
    resetAt: getNextMonthStart(),
    generations: {
      ...generations,
      included: plan.includedGenerations,
      overagePriceUsd: plan.overagePriceUsd,
      canGenerate: !generationHardLimit || !generations.reached,
      remainingLabel: generations.reached && !generationHardLimit ? "Included usage spent" : generations.remainingLabel,
    },
    workspaces: createLimitUsage({ used: ownedWorkspaceCount[0]?.value ?? 0, limit: plan.workspaceLimit, hardLimit: plan.workspaceLimit !== null, unit: "workspaces" }),
    projects: createLimitUsage({ used: workspaceProjectCount[0]?.value ?? 0, limit: plan.projectLimit, hardLimit: plan.projectLimit !== null, unit: "projects" }),
    providerAccounts: createLimitUsage({ used: workspaceProviders.filter((provider) => isExplicitProviderConnection(provider.metadata)).length, limit: plan.providerAccountLimit, hardLimit: plan.providerAccountLimit !== null, unit: "provider accounts" }),
    repositories: {
      used: workspaceRepositoryCount[0]?.value ?? 0,
      label: `${(workspaceRepositoryCount[0]?.value ?? 0).toLocaleString("en-US")} tracked`,
    },
    changelogs: {
      used: workspaceChangelogCount[0]?.value ?? 0,
      label: `${(workspaceChangelogCount[0]?.value ?? 0).toLocaleString("en-US")} saved`,
    },
  };
}

export function formatUsageResetDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(value);
}
