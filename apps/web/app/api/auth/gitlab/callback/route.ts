import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getProviderAccountLimit, toPlanSlug } from "@/lib/plans";
import { verifyProviderOAuthState } from "@/lib/provider-oauth-state";
import { encryptProviderToken } from "@/lib/provider-token-vault";
import { integrations } from "@commitglow/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

function isExplicitProviderConnection(metadata: unknown) {
  return Boolean(metadata && typeof metadata === "object" && (metadata as Record<string, unknown>).source === "explicit-provider-connect");
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const code = request.nextUrl.searchParams.get("code");
  const state = verifyProviderOAuthState(request.nextUrl.searchParams.get("state"));

  if (!session || !code || !state || state.userId !== session.user.id || !env.gitlabClientId || !env.gitlabClientSecret || !env.betterAuthUrl) {
    redirect("/dashboard/providers?error=gitlab");
  }

  const connectedProviders = await db.select({ id: integrations.id, metadata: integrations.metadata }).from(integrations).where(eq(integrations.organizationId, state.organizationId));
  const explicitConnectedProviders = connectedProviders.filter((provider) => isExplicitProviderConnection(provider.metadata)).length;
  const providerLimit = getProviderAccountLimit(toPlanSlug(session.user.plan));

  if (providerLimit !== null && explicitConnectedProviders >= providerLimit) {
    redirect("/dashboard/providers?error=limit");
  }

  const redirectUri = new URL("/api/auth/gitlab/callback", env.betterAuthUrl).toString();
  const tokenResponse = await fetch("https://gitlab.com/oauth/token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "CommitGlow" },
    body: new URLSearchParams({
      client_id: env.gitlabClientId,
      client_secret: env.gitlabClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    }),
    cache: "no-store"
  });

  if (!tokenResponse.ok) {
    redirect("/dashboard/providers?error=gitlab");
  }

  const tokenPayload = (await tokenResponse.json()) as Record<string, unknown>;
  const accessToken = typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : null;

  if (!accessToken) {
    redirect("/dashboard/providers?error=gitlab");
  }

  const userResponse = await fetch("https://gitlab.com/api/v4/user", {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}`, "User-Agent": "CommitGlow" },
    cache: "no-store"
  });

  if (!userResponse.ok) {
    redirect("/dashboard/providers?error=gitlab");
  }

  const userPayload = (await userResponse.json()) as Record<string, unknown>;
  const accountName = typeof userPayload.username === "string" ? userPayload.username : typeof userPayload.name === "string" ? userPayload.name : "gitlab";
  const [existing] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(and(eq(integrations.organizationId, state.organizationId), eq(integrations.provider, "gitlab"), eq(integrations.providerAccountId, accountName)))
    .limit(1);
  const metadata = {
    source: "explicit-provider-connect",
    connectedFor: "repository-access",
    authType: "oauth",
    requiredScopes: ["read_api"]
  };
  const accessTokenRef = encryptProviderToken({ token: accessToken });

  if (existing) {
    await db.update(integrations).set({ providerAccountName: accountName, accessTokenRef, metadata, updatedAt: new Date() }).where(eq(integrations.id, existing.id));
  } else {
    await db.insert(integrations).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      organizationId: state.organizationId,
      provider: "gitlab",
      providerAccountId: accountName,
      providerAccountName: accountName,
      accessTokenRef,
      metadata
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/providers");
  redirect("/dashboard/providers?connect=gitlab-success");
}
