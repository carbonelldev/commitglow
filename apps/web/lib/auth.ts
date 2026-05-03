import { db } from "@commitglow/db";
import * as schema from "@commitglow/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env, requireServerEnv } from "./env";

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
  user: {
    additionalFields: {
      plan: {
        type: "string",
        required: false,
        defaultValue: "free",
        input: false
      },
      stripeCustomerId: {
        type: "string",
        required: false,
        input: false
      }
    }
  }
});
