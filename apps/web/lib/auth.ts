import { db } from "@commitglow/db";
import * as schema from "@commitglow/db/schema";
import { checkout, polar, portal, usage, webhooks } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env, requireServerEnv } from "./env";
import { getPolarClient, polarProducts, syncAccountPlanFromPolarPayload } from "./polar-billing";

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

const plugins = env.polarAccessToken
  ? [
      polar({
        client: getPolarClient()!,
        createCustomerOnSignUp: true,
        use: [
          checkout({
            products: polarProducts,
            successUrl: "/dashboard/billing/success?checkout_id={CHECKOUT_ID}",
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
