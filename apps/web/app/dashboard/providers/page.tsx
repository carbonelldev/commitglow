import { getSettingsSnapshot } from "@/app/dashboard/settings/actions";
import { ConnectGitHubButton } from "@/components/connect-github-button";
import { DisconnectProviderButton } from "@/components/disconnect-provider-button";
import { db } from "@/lib/db";
import { formatProviderAccountLimit, getProviderAccountLimit, toPlanSlug } from "@/lib/plans";
import { Card } from "@commitglow/ui";
import { account, integrations } from "@commitglow/db/schema";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const upcomingProviders = [
  { provider: "GitLab", detail: "Self-hosted and gitlab.com support planned after GitHub." },
  { provider: "Bitbucket", detail: "Workspace repository access and release-note generation planned later." }
];

const requiredGitHubScopes = ["repo"];

function isExplicitProviderConnection(metadata: unknown) {
  return Boolean(metadata && typeof metadata === "object" && (metadata as Record<string, unknown>).source === "explicit-provider-connect");
}

function parseScopes(value: string | null | undefined) {
  return new Set((value ?? "").split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean));
}

async function verifyGitHubRepositoryScopes(accessToken: string, savedScope: string | null | undefined) {
  const savedScopes = parseScopes(savedScope);

  if (!requiredGitHubScopes.every((scope) => savedScopes.has(scope))) {
    return { ok: false, scopes: Array.from(savedScopes), message: "GitHub did not grant repository access. Reconnect and approve repository permissions." };
  }

  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "CommitGlow",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return { ok: false, scopes: Array.from(savedScopes), message: "GitHub token validation failed. Reconnect GitHub and try again." };
  }

  const headerScopes = parseScopes(response.headers.get("x-oauth-scopes"));
  const effectiveScopes = headerScopes.size > 0 ? headerScopes : savedScopes;

  if (!requiredGitHubScopes.every((scope) => effectiveScopes.has(scope))) {
    return { ok: false, scopes: Array.from(effectiveScopes), message: "GitHub token is missing repository access. Reconnect and approve repository permissions." };
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const login = typeof payload.login === "string" ? payload.login : undefined;

  return { ok: true, scopes: Array.from(effectiveScopes), login, message: "" };
}

async function syncGitHubProvider(userId: string, organizationId: string, plan: string) {
  const githubAccounts = await db
    .select({ accountId: account.accountId, accessToken: account.accessToken, scope: account.scope, updatedAt: account.updatedAt })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github"), isNotNull(account.accessToken)))
    .orderBy(desc(account.updatedAt));

  if (githubAccounts.length === 0) {
    return { status: "error", message: "No GitHub account token was found. Try connecting GitHub again." };
  }

  const connectedProviderAccounts = await db
    .select({ providerAccountId: integrations.providerAccountId, metadata: integrations.metadata })
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "github")));
  const explicitConnectedAccountIds = new Set(connectedProviderAccounts.filter((provider) => isExplicitProviderConnection(provider.metadata)).flatMap((provider) => (provider.providerAccountId ? [provider.providerAccountId] : [])));
  const githubAccount = githubAccounts.find((candidate) => !explicitConnectedAccountIds.has(candidate.accountId)) ?? githubAccounts[0];

  if (!githubAccount.accessToken) {
    return { status: "error", message: "No GitHub account token was found. Try connecting GitHub again." };
  }

  const permissionCheck = await verifyGitHubRepositoryScopes(githubAccount.accessToken, githubAccount.scope);

  if (!permissionCheck.ok) {
    return { status: "error", message: permissionCheck.message };
  }

  const [existing] = await db
    .select({ id: integrations.id, metadata: integrations.metadata })
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "github"), eq(integrations.providerAccountId, githubAccount.accountId)))
    .limit(1);

  if (existing && isExplicitProviderConnection(existing.metadata)) {
    return { status: "success", message: "GitHub is already connected to this workspace." };
  }

  if (existing) {
    await db
      .update(integrations)
      .set({
        providerAccountName: permissionCheck.login ?? githubAccount.accountId,
        accessTokenRef: "better-auth:account.access_token",
        metadata: {
          source: "explicit-provider-connect",
          connectedFor: "repository-access",
          scopes: permissionCheck.scopes,
          requiredScopes: requiredGitHubScopes
        },
        updatedAt: new Date()
      })
      .where(eq(integrations.id, existing.id));

    return { status: "success", message: "GitHub repository access connected to this workspace." };
  }

  const providerLimit = getProviderAccountLimit(toPlanSlug(plan));
  const connectedProviders = await db
    .select({ id: integrations.id, metadata: integrations.metadata })
    .from(integrations)
    .where(eq(integrations.organizationId, organizationId));

  const explicitConnectedProviders = connectedProviders.filter((provider) => isExplicitProviderConnection(provider.metadata)).length;

  if (providerLimit !== null && explicitConnectedProviders >= providerLimit) {
    return { status: "error", message: "This workspace has reached its Git provider account limit. Disconnect a provider or upgrade." };
  }

  await db.insert(integrations).values({
    id: crypto.randomUUID(),
    userId,
    organizationId,
    provider: "github",
    providerAccountId: githubAccount.accountId,
    providerAccountName: permissionCheck.login ?? githubAccount.accountId,
    accessTokenRef: "better-auth:account.access_token",
    metadata: {
      source: "explicit-provider-connect",
      connectedFor: "repository-access",
      scopes: permissionCheck.scopes,
      requiredScopes: requiredGitHubScopes
    }
  });

  return { status: "success", message: "GitHub repository access connected to this workspace." };
}

export default async function ProvidersPage({ searchParams }: { searchParams: Promise<{ connect?: string }> }) {
  const snapshot = await getSettingsSnapshot();

  if (!snapshot) {
    redirect("/auth/sign-in");
  }

  const { connect } = await searchParams;
  const syncResult = connect === "github" ? await syncGitHubProvider(snapshot.user.id, snapshot.organization.id, String(snapshot.user.plan ?? "free")) : null;

  const workspaceProviders = await db
    .select({ id: integrations.id, provider: integrations.provider, providerAccountName: integrations.providerAccountName, metadata: integrations.metadata, createdAt: integrations.createdAt })
    .from(integrations)
    .where(eq(integrations.organizationId, snapshot.organization.id))
    .orderBy(asc(integrations.provider), asc(integrations.providerAccountName));
  const connectedProviders = workspaceProviders.filter((provider) => isExplicitProviderConnection(provider.metadata));
  const providerLimitLabel = formatProviderAccountLimit(toPlanSlug(snapshot.user.plan));
  const providerLimit = getProviderAccountLimit(toPlanSlug(snapshot.user.plan));
  const canConnectAnotherProvider = providerLimit === null || connectedProviders.length < providerLimit;
  const githubConnected = connectedProviders.some((provider) => provider.provider === "github");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Providers</p>
        <h1 className="mt-4 font-mono text-4xl text-white">Provider connections</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">Connect Git providers to the active workspace. These permissions unlock private repository access and future automated commit sync.</p>
      </div>

      {syncResult ? (
        <div className={["mt-6 rounded-sm border p-4 font-mono text-sm", syncResult.status === "error" ? "border-violet-300/30 bg-violet-500/10 text-violet-100" : "border-white/10 bg-white/[0.03] text-zinc-300"].join(" ")}>
          {syncResult.status === "error" ? "! " : "// "}{syncResult.message}
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card className="relative overflow-hidden hover:border-violet-300/40">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/70 to-transparent" />
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Available</p>
          <h2 className="mt-4 font-mono text-2xl text-white">GitHub</h2>
          <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Grant explicit repository permissions for private repository access, branch metadata, and future commit sync. GitHub login alone is not counted as a workspace provider.</p>
          <div className="mt-4 rounded-sm border border-white/10 bg-black/30 p-3 font-mono text-xs leading-5 text-zinc-600">
            Required permission: <span className="text-zinc-300">repo</span>
          </div>
          {githubConnected ? <p className="mt-5 font-mono text-sm text-zinc-400">// GitHub repository access is connected.</p> : null}
          {canConnectAnotherProvider ? <ConnectGitHubButton callbackURL="/dashboard/providers?connect=github" label={githubConnected ? "Connect Another GitHub Account" : "Connect GitHub Repositories"} variant={githubConnected ? "secondary" : "primary"} /> : <p className="mt-5 font-mono text-sm text-zinc-500">// Provider account limit reached.</p>}
        </Card>
        {upcomingProviders.map((item) => (
          <Card key={item.provider}>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600">// Coming Soon</p>
            <h2 className="mt-4 font-mono text-2xl text-white">{item.provider}</h2>
            <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">{item.detail}</p>
            <span className="mt-5 inline-flex rounded-sm border border-white/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-zinc-600">Not connected</span>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-mono text-lg text-white">Connected to {snapshot.organization.name}</h2>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">{connectedProviders.length}/{providerLimitLabel}</span>
        </div>
        {connectedProviders.length === 0 ? (
          <div className="rounded-sm border border-dashed border-white/10 p-6">
            <p className="font-mono text-xl text-white">No providers connected.</p>
            <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">Connect GitHub to make private repository access available to this workspace.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {connectedProviders.map((provider) => (
              <article key={provider.id} className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-base text-white">{provider.provider}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">{provider.providerAccountName || "connected account"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">workspace-scoped</span>
                    <DisconnectProviderButton integrationId={provider.id} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
