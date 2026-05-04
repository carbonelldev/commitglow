"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getActiveOrganization } from "@/lib/organizations";
import { getProviderAccountLimit, toPlanSlug } from "@/lib/plans";
import { createProviderOAuthState } from "@/lib/provider-oauth-state";
import { encryptProviderToken } from "@/lib/provider-token-vault";
import { integrations } from "@commitglow/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type TokenProvider = "gitlab" | "bitbucket" | "gitea";

function isExplicitProviderConnection(metadata: unknown) {
  return Boolean(metadata && typeof metadata === "object" && (metadata as Record<string, unknown>).source === "explicit-provider-connect");
}

function isBlockedProviderHost(hostname: string) {
  const host = hostname.toLowerCase();

  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function normalizeGiteaBaseUrl(value: string) {
  try {
    const url = new URL(value.trim().replace(/\/+$/g, ""));

    if (url.protocol !== "https:" || url.username || url.password || isBlockedProviderHost(url.hostname)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

async function validateToken(provider: TokenProvider, token: string, baseUrl?: string) {
  const headers: HeadersInit = { Accept: "application/json", "User-Agent": "CommitGlow" };
  let url: string;

  if (provider === "gitlab") {
    url = "https://gitlab.com/api/v4/user";
    headers["PRIVATE-TOKEN"] = token;
  } else if (provider === "bitbucket") {
    url = "https://api.bitbucket.org/2.0/user";
    headers.Authorization = `Bearer ${token}`;
  } else {
    if (!baseUrl) {
      return { ok: false, message: "Gitea requires an HTTPS instance URL." };
    }

    url = `${baseUrl}/api/v1/user`;
    headers.Authorization = `token ${token}`;
  }

  const response = await fetch(url, { headers, cache: "no-store" });

  if (!response.ok) {
    return { ok: false, message: `${provider} token validation failed.` };
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const login = typeof payload.username === "string" ? payload.username : typeof payload.login === "string" ? payload.login : typeof payload.nickname === "string" ? payload.nickname : undefined;

  return { ok: true, login };
}

async function getConnectionContext() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const connectedProviders = await db
    .select({ id: integrations.id, metadata: integrations.metadata })
    .from(integrations)
    .where(eq(integrations.organizationId, organization.id));
  const explicitConnectedProviders = connectedProviders.filter((provider) => isExplicitProviderConnection(provider.metadata)).length;
  const providerLimit = getProviderAccountLimit(toPlanSlug(session.user.plan));

  if (providerLimit !== null && explicitConnectedProviders >= providerLimit) {
    return null;
  }

  return { session, organization };
}

async function upsertTokenIntegration({ userId, organizationId, provider, providerAccountId, providerAccountName, token, baseUrl, authType, requiredScopes }: { userId: string; organizationId: string; provider: TokenProvider; providerAccountId: string; providerAccountName: string; token: string; baseUrl?: string; authType: string; requiredScopes: string[] }) {
  const [existing] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, provider), eq(integrations.providerAccountId, providerAccountId)))
    .limit(1);
  const encryptedToken = encryptProviderToken({ token, baseUrl });
  const metadata = {
    source: "explicit-provider-connect",
    connectedFor: "repository-access",
    authType,
    requiredScopes
  };

  if (existing) {
    await db.update(integrations).set({ providerAccountName, accessTokenRef: encryptedToken, metadata, updatedAt: new Date() }).where(eq(integrations.id, existing.id));
  } else {
    await db.insert(integrations).values({
      id: crypto.randomUUID(),
      userId,
      organizationId,
      provider,
      providerAccountId,
      providerAccountName,
      accessTokenRef: encryptedToken,
      metadata
    });
  }
}

export async function connectGitLabProvider() {
  const context = await getConnectionContext();

  if (!context || !env.gitlabClientId || !env.gitlabClientSecret || !env.betterAuthUrl) {
    return;
  }

  const redirectUri = new URL("/api/auth/gitlab/callback", env.betterAuthUrl).toString();
  const authorizeUrl = new URL("https://gitlab.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", env.gitlabClientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "read_api");
  authorizeUrl.searchParams.set("state", createProviderOAuthState(context.session.user.id, context.organization.id));

  redirect(authorizeUrl.toString());
}

export async function connectBitbucketProvider() {
  const context = await getConnectionContext();

  if (!context) {
    redirect("/dashboard/providers?error=bitbucket-limit");
  }

  if (!env.bitbucketApiToken) {
    redirect("/dashboard/providers?error=bitbucket-missing-token");
  }

  const validation = await validateToken("bitbucket", env.bitbucketApiToken);

  if (!validation.ok) {
    redirect("/dashboard/providers?error=bitbucket-invalid-token");
  }

  const accountName = validation.login ?? "bitbucket";

  await upsertTokenIntegration({
    userId: context.session.user.id,
    organizationId: context.organization.id,
    provider: "bitbucket",
    providerAccountId: accountName,
    providerAccountName: accountName,
    token: env.bitbucketApiToken,
    authType: "api-token",
    requiredScopes: ["read:me", "read:account", "read:workspace:bitbucket", "read:project:bitbucket", "read:repository:bitbucket"]
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/providers");
  redirect("/dashboard/providers?connect=bitbucket-success");
}

export async function connectTokenProvider(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return;
  }

  const provider = String(formData.get("provider") ?? "") as TokenProvider;
  const token = String(formData.get("token") ?? "").trim();
  const rawBaseUrl = String(formData.get("baseUrl") ?? "").trim();

  if (provider !== "gitea" || token.length < 8) {
    return;
  }

  const baseUrl = provider === "gitea" ? normalizeGiteaBaseUrl(rawBaseUrl) ?? undefined : undefined;

  if (provider === "gitea" && !baseUrl) {
    return;
  }

  const context = await getConnectionContext();

  if (!context) {
    redirect("/dashboard/providers?error=gitea-limit");
  }

  const validation = await validateToken(provider, token, baseUrl);

  if (!validation.ok) {
    redirect("/dashboard/providers?error=gitea-invalid-token");
  }

  const accountName = validation.login ?? provider;
  const providerAccountId = provider === "gitea" ? `${baseUrl}:${accountName}` : accountName;

  await upsertTokenIntegration({
    userId: context.session.user.id,
    organizationId: context.organization.id,
    provider,
    providerAccountId,
    providerAccountName: validation.login ?? providerAccountId,
    token,
    baseUrl,
    authType: "token",
    requiredScopes: ["repo"]
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/providers");
  redirect("/dashboard/providers?connect=gitea-success");
}

export async function disconnectProvider(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return;
  }

  const integrationId = String(formData.get("integrationId") ?? "");
  const { active: organization } = await getActiveOrganization(session.user);

  await db
    .delete(integrations)
    .where(and(eq(integrations.id, integrationId), eq(integrations.organizationId, organization.id)));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/providers");
  redirect("/dashboard/providers?disconnected=1");
}
