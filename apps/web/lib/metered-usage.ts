import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { meteredUsageConfig, toPlanSlug } from "@/lib/plans";
import { Polar } from "@polar-sh/sdk";
import { usageEvents, user as users } from "@commitglow/db/schema";
import { and, eq, gte, sum } from "drizzle-orm";

type UsageType = "generation" | "repo_sync" | "export";

type TrackMeteredUsageInput = {
  userId: string;
  organizationId?: string | null;
  type: UsageType;
  quantity?: number;
  idempotencyKey?: string;
  metadata?: Record<string, string | number | boolean>;
};

function createPolarClient() {
  if (!env.polarAccessToken) {
    return null;
  }

  return new Polar({
    accessToken: env.polarAccessToken,
    server: env.polarServer === "production" ? "production" : "sandbox"
  });
}

export async function trackMeteredUsage({ userId, organizationId, type, quantity = 1, idempotencyKey, metadata = {} }: TrackMeteredUsageInput) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Usage quantity must be a positive integer.");
  }

  const [account] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).limit(1);

  if (!account) {
    throw new Error("Unable to track usage for an unknown account.");
  }

  const usageEventId = idempotencyKey ?? crypto.randomUUID();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [usageBeforeThisEvent] = await db
    .select({ quantity: sum(usageEvents.quantity) })
    .from(usageEvents)
    .where(and(eq(usageEvents.userId, userId), eq(usageEvents.type, type), gte(usageEvents.createdAt, monthStart)));
  const previousQuantity = Number(usageBeforeThisEvent?.quantity ?? 0);

  await db.insert(usageEvents).values({
    id: usageEventId,
    userId,
    organizationId,
    type,
    quantity,
    metadata
  });

  if (toPlanSlug(account.plan) !== meteredUsageConfig.billablePlan) {
    return { metered: false, usageEventId };
  }

  const includedQuantity = meteredUsageConfig.teamIncludedGenerations;
  const overageBeforeThisEvent = Math.max(previousQuantity - includedQuantity, 0);
  const overageAfterThisEvent = Math.max(previousQuantity + quantity - includedQuantity, 0);
  const billableQuantity = overageAfterThisEvent - overageBeforeThisEvent;

  if (billableQuantity < 1) {
    return { metered: false, usageEventId };
  }

  const polarClient = createPolarClient();

  if (!polarClient) {
    throw new Error("POLAR_ACCESS_TOKEN is required to meter Team usage.");
  }

  await polarClient.events.ingest({
    events: [
      {
        name: meteredUsageConfig.eventName,
        externalCustomerId: userId,
        externalId: usageEventId,
        metadata: {
          ...metadata,
          usage_type: type,
          included_monthly_units: includedQuantity,
          [meteredUsageConfig.quantityKey]: billableQuantity
        }
      }
    ]
  });

  return { metered: true, usageEventId, billableQuantity };
}
