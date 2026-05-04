import { db } from "@commitglow/db";
import * as schema from "@commitglow/db/schema";
import { checkout, polar, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { env, requireServerEnv } from "./env";
import { paidPlanList } from "./plans";

const socialProviders = {
  ...(env.githubClientId && env.githubClientSecret
    ? {
        github: {
          clientId: env.githubClientId,
          clientSecret: env.githubClientSecret
        }
      }
    : {}),
  ...(env.googleClientId && env.googleClientSecret
    ? {
        google: {
          clientId: env.googleClientId,
          clientSecret: env.googleClientSecret
        }
      }
    : {})
};

const polarProductIds = {
  POLAR_PRO_PRODUCT_ID: env.polarProProductId,
  POLAR_TEAM_PRODUCT_ID: env.polarTeamProductId
};

const polarProducts = paidPlanList.flatMap((plan) => {
  const productId = polarProductIds[plan.polarProductEnv];

  if (!productId || !plan.checkoutSlug) {
    return [];
  }

  return [{ productId, slug: plan.checkoutSlug }];
});

function getPolarPayloadData(payload: Record<string, unknown>) {
  const data = payload.data;

  return data && typeof data === "object" ? (data as Record<string, unknown>) : payload;
}

function getPolarReferenceId(payload: Record<string, unknown>) {
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

function getPolarProductId(payload: Record<string, unknown>) {
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

function findPolarProductId(value: unknown): string | undefined {
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

function getPlanSlugFromPolarProduct(productId: string) {
  return polarProducts.find((product) => product.productId === productId)?.slug;
}

async function updateAccountPlanForReference(referenceId: string, plan: "free" | "pro" | "team") {
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

async function syncAccountPlanFromPolarPayload(payload: Record<string, unknown>) {
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

const plugins = env.polarAccessToken
  ? [
      polar({
        client: new Polar({
          accessToken: env.polarAccessToken,
          server: env.polarServer === "production" ? "production" : "sandbox"
        }),
        createCustomerOnSignUp: true,
        use: [
          checkout({
            products: polarProducts,
            successUrl: "/dashboard/settings?checkout_id={CHECKOUT_ID}",
            authenticatedUsersOnly: true
          }),
          portal(),
          usage(),
          ...(env.polarWebhookSecret
            ? [
                webhooks({
                  secret: env.polarWebhookSecret,
                  onPayload: async (payload: Record<string, unknown>) => {
                    await syncAccountPlanFromPolarPayload(payload);
                  }
                })
              ]
            : [])
        ]
      })
    ]
  : [];

export const auth = betterAuth({
  secret: requireServerEnv("betterAuthSecret"),
  baseURL: env.betterAuthUrl,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  emailAndPassword: {
    enabled: true
  },
  socialProviders,
  plugins,
  user: {
    additionalFields: {
      plan: {
        type: "string",
        required: false,
        defaultValue: "free",
        input: false
      },
      polarCustomerId: {
        type: "string",
        required: false,
        input: false
      }
    }
  }
});
