import { db } from "@commitglow/db";
import * as schema from "@commitglow/db/schema";
import { Polar } from "@polar-sh/sdk";
import { eq } from "drizzle-orm";
import { env } from "./env";
import { paidPlanList, type PaidPlanSlug } from "./plans";

const polarProductIds = {
  POLAR_PRO_PRODUCT_ID: env.polarProProductId,
  POLAR_TEAM_PRODUCT_ID: env.polarTeamProductId
};

export const polarProducts = paidPlanList.flatMap((plan) => {
  const productId = polarProductIds[plan.polarProductEnv];

  if (!productId || !plan.checkoutSlug) {
    return [];
  }

  return [{ productId, slug: plan.checkoutSlug }];
});

export function isPolarCheckoutConfigured(slug: PaidPlanSlug) {
  return Boolean(env.polarAccessToken && polarProducts.some((product) => product.slug === slug));
}

export function getPolarClient() {
  if (!env.polarAccessToken) {
    return null;
  }

  return new Polar({
    accessToken: env.polarAccessToken,
    server: env.polarServer === "production" ? "production" : "sandbox"
  });
}

export function getPolarPayloadData(payload: Record<string, unknown>) {
  const data = payload.data;

  return data && typeof data === "object" ? (data as Record<string, unknown>) : payload;
}

export function getPolarReferenceId(payload: Record<string, unknown>) {
  const data = getPolarPayloadData(payload);
  const metadata = data.metadata;

  if (typeof data.referenceId === "string") {
    return data.referenceId;
  }

  if (typeof data.reference_id === "string") {
    return data.reference_id;
  }

  if (metadata && typeof metadata === "object") {
    const referenceId = (metadata as Record<string, unknown>).referenceId ?? (metadata as Record<string, unknown>).reference_id;

    if (typeof referenceId === "string") {
      return referenceId;
    }
  }

  return undefined;
}

export function getPolarProductId(payload: Record<string, unknown>) {
  const data = getPolarPayloadData(payload);
  const product = data.product;

  if (typeof data.productId === "string") {
    return data.productId;
  }

  if (typeof data.product_id === "string") {
    return data.product_id;
  }

  if (product && typeof product === "object") {
    const id = (product as Record<string, unknown>).id;

    if (typeof id === "string") {
      return id;
    }
  }

  return undefined;
}

function getPolarPayloadStatus(payload: Record<string, unknown>) {
  const data = getPolarPayloadData(payload);
  const status = data.status;

  return typeof status === "string" ? status.toLowerCase() : undefined;
}

function isPolarPaidPlanEvent(eventType: string, status?: string) {
  return eventType.includes("order.paid") || eventType.includes("subscription.active") || (eventType.includes("subscription.updated") && status === "active");
}

export function findPolarProductId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const productId = findPolarProductId(item);

      if (productId) {
        return productId;
      }
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;
  const directProductId = typeof record.productId === "string" ? record.productId : typeof record.product_id === "string" ? record.product_id : undefined;

  if (directProductId && getPlanSlugFromPolarProduct(directProductId)) {
    return directProductId;
  }

  const product = record.product;

  if (product && typeof product === "object") {
    const id = (product as Record<string, unknown>).id;

    if (typeof id === "string" && getPlanSlugFromPolarProduct(id)) {
      return id;
    }
  }

  for (const nested of Object.values(record)) {
    const productId = findPolarProductId(nested);

    if (productId) {
      return productId;
    }
  }

  return undefined;
}

export function getPlanSlugFromPolarProduct(productId: string) {
  return polarProducts.find((product) => product.productId === productId)?.slug;
}

export async function updateAccountPlanForReference(referenceId: string, plan: "free" | "pro" | "team") {
  const updatedUsers = await db.update(schema.user).set({ plan, updatedAt: new Date() }).where(eq(schema.user.id, referenceId)).returning({ id: schema.user.id });

  if (updatedUsers.length > 0) {
    return;
  }

  const [organization] = await db.select({ ownerId: schema.organizations.ownerId }).from(schema.organizations).where(eq(schema.organizations.id, referenceId)).limit(1);

  if (!organization) {
    return;
  }

  await db.update(schema.user).set({ plan, updatedAt: new Date() }).where(eq(schema.user.id, organization.ownerId));
}

export async function syncAccountPlanFromPolarPayload(payload: Record<string, unknown>) {
  const referenceId = getPolarReferenceId(payload);
  const eventType = typeof payload.type === "string" ? payload.type.toLowerCase() : "";
  const status = getPolarPayloadStatus(payload);

  if (!referenceId) {
    return;
  }

  if (eventType.includes("revoked")) {
    await updateAccountPlanForReference(referenceId, "free");
    return;
  }

  if (!isPolarPaidPlanEvent(eventType, status)) {
    return;
  }

  const productId = getPolarProductId(payload) ?? findPolarProductId(payload);
  const plan = productId ? getPlanSlugFromPolarProduct(productId) : undefined;

  if (!plan) {
    return;
  }

  await updateAccountPlanForReference(referenceId, plan);
}
