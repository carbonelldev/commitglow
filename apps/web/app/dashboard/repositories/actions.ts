"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { decryptProviderToken } from "@/lib/provider-token-vault";
import { account, commits, integrations, projects, repositories } from "@commitglow/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export type RepositoryFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type GitHubRepositorySearchResult = {
  provider: GitProvider;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
};

export type GitProvider = "github" | "gitlab" | "bitbucket" | "gitea";

type ParsedGitRepository = {
  provider: GitProvider;
  owner: string;
  name: string;
  url: string;
  apiBaseUrl?: string;
};

type GitRepositoryLookup = ParsedGitRepository & {
  defaultBranch: string;
  isPrivate: boolean;
};

type WorkspaceProviderAuth = {
  provider: GitProvider;
  integrationId: string;
  accessToken: string;
  baseUrl?: string;
};

const searchableProviders = ["github", "gitlab", "bitbucket", "gitea"] as const;

const requiredProviderScopes: Record<(typeof searchableProviders)[number], string[]> = {
  github: ["repo"],
  gitlab: ["read_api"],
  bitbucket: ["repository"],
  gitea: ["repo"]
};

function isValidPathSegment(value: string) {
  return /^[A-Za-z0-9_.-]+$/.test(value);
}

function isValidOwnerPath(value: string) {
  return value.split("/").every(isValidPathSegment);
}

function isBlockedRepositoryHost(hostname: string) {
  const host = hostname.toLowerCase();

  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function parseGitRepository(value: string): ParsedGitRepository | null {
  const trimmed = value.trim().replace(/\.git$/i, "");

  if (/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    const [owner, name] = trimmed.split("/");

    return { provider: "github", owner, name, url: `https://github.com/${owner}/${name}` };
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password || isBlockedRepositoryHost(url.hostname)) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const name = parts.at(-1)!.replace(/\.git$/i, "");
  const owner = parts.slice(0, -1).join("/");

  if (!isValidOwnerPath(owner) || !isValidPathSegment(name)) {
    return null;
  }

  if (hostname === "github.com" && parts.length === 2) {
    return { provider: "github", owner, name, url: `https://github.com/${owner}/${name}` };
  }

  if (hostname === "gitlab.com") {
    return { provider: "gitlab", owner, name, url: `https://gitlab.com/${owner}/${name}` };
  }

  if (hostname === "bitbucket.org" && parts.length === 2) {
    return { provider: "bitbucket", owner, name, url: `https://bitbucket.org/${owner}/${name}` };
  }

  if (!["github.com", "gitlab.com", "bitbucket.org"].includes(hostname) && parts.length === 2) {
    const origin = `${url.protocol}//${url.host}`;

    return { provider: "gitea", owner, name, url: `${origin}/${owner}/${name}`, apiBaseUrl: origin };
  }

  return null;
}

function parseGitRepositoryReference(provider: GitProvider, owner: string, name: string, url: string): ParsedGitRepository | null {
  if (!isValidOwnerPath(owner) || !isValidPathSegment(name)) {
    return null;
  }

  if (provider === "gitea") {
    const parsed = parseGitRepository(url);

    return parsed?.provider === "gitea" ? parsed : null;
  }

  return {
    provider,
    owner,
    name,
    url
  };
}

function hasRepositoryScope(provider: GitProvider, value: string | null | undefined) {
  const scopes = new Set((value ?? "").split(/[\s,]+/).filter(Boolean));

  return requiredProviderScopes[provider].every((scope) => scopes.has(scope));
}

function isExplicitProviderConnection(metadata: unknown) {
  return Boolean(metadata && typeof metadata === "object" && (metadata as Record<string, unknown>).source === "explicit-provider-connect");
}

function getGitHubNextPage(linkHeader: string | null) {
  if (!linkHeader) {
    return null;
  }

  for (const link of linkHeader.split(",")) {
    const [urlPart, relPart] = link.split(";").map((part) => part.trim());

    if (relPart === 'rel="next"') {
      return urlPart.replace(/^<|>$/g, "");
    }
  }

  return null;
}

async function fetchJsonArrayPages(initialUrl: string, headers: HeadersInit, maxPages = 10) {
  const items: Array<Record<string, unknown>> = [];
  let nextUrl: string | null = initialUrl;
  let page = 0;

  while (nextUrl && page < maxPages) {
    const response = await fetch(nextUrl, {
      headers,
      cache: "no-store"
    });

    if (!response.ok) {
      return { ok: false, status: response.status, items };
    }

    const payload = (await response.json()) as unknown;

    if (!Array.isArray(payload)) {
      return { ok: false, status: response.status, items };
    }

    items.push(...(payload as Array<Record<string, unknown>>));
    nextUrl = getGitHubNextPage(response.headers.get("link"));
    page += 1;
  }

  return { ok: true, status: 200, items };
}

function githubHeaders(accessToken?: string | null): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "CommitGlow",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}

function providerHeaders(provider: GitProvider, accessToken?: string | null): HeadersInit {
  if (provider === "github") {
    return githubHeaders(accessToken);
  }

  if (provider === "gitlab") {
    return {
      Accept: "application/json",
      "User-Agent": "CommitGlow",
      ...(accessToken ? { "PRIVATE-TOKEN": accessToken } : {})
    };
  }

  if (provider === "bitbucket") {
    return {
      Accept: "application/json",
      "User-Agent": "CommitGlow",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    };
  }

  return {
    Accept: "application/json",
    "User-Agent": "CommitGlow",
    ...(accessToken ? { Authorization: `token ${accessToken}` } : {})
  };
}

async function fetchGitHubPages(initialUrl: string, accessToken: string, maxPages = 10) {
  return fetchJsonArrayPages(initialUrl, githubHeaders(accessToken), maxPages);
}

async function fetchJsonObject(url: string, headers: HeadersInit) {
  const response = await fetch(url, { headers, cache: "no-store" });

  if (response.status === 404 || response.status === 403) {
    return { ok: false, inaccessible: true, status: response.status, data: null };
  }

  if (!response.ok) {
    return { ok: false, inaccessible: false, status: response.status, data: null };
  }

  const payload = (await response.json()) as unknown;

  return { ok: payload && typeof payload === "object" && !Array.isArray(payload), inaccessible: false, status: response.status, data: payload as Record<string, unknown> };
}

async function getWorkspaceProviderAuths(organizationId: string, provider?: GitProvider): Promise<WorkspaceProviderAuth[]> {
  const workspaceIntegrations = await db
    .select({ id: integrations.id, userId: integrations.userId, provider: integrations.provider, providerAccountId: integrations.providerAccountId, accessTokenRef: integrations.accessTokenRef, metadata: integrations.metadata, updatedAt: integrations.updatedAt })
    .from(integrations)
    .where(provider ? and(eq(integrations.organizationId, organizationId), eq(integrations.provider, provider)) : eq(integrations.organizationId, organizationId))
    .orderBy(desc(integrations.updatedAt));
  const explicitIntegrations = workspaceIntegrations.filter((item) => searchableProviders.includes(item.provider) && isExplicitProviderConnection(item.metadata) && item.providerAccountId);
  const auths: WorkspaceProviderAuth[] = [];

  for (const integration of explicitIntegrations) {
    const integrationProvider = integration.provider as GitProvider;
    const storedToken = decryptProviderToken(integration.accessTokenRef);

    if (storedToken) {
      auths.push({ provider: integrationProvider, integrationId: integration.id, accessToken: storedToken.token, baseUrl: storedToken.baseUrl });
      continue;
    }

    if (integrationProvider !== "github") {
      continue;
    }

    const [providerAccount] = await db
      .select({ accessToken: account.accessToken, scope: account.scope })
      .from(account)
      .where(and(eq(account.userId, integration.userId), eq(account.providerId, integrationProvider), eq(account.accountId, integration.providerAccountId!)))
      .limit(1);

    if (!providerAccount?.accessToken || !hasRepositoryScope(integrationProvider, providerAccount.scope)) {
      continue;
    }

    auths.push({ provider: integrationProvider, integrationId: integration.id, accessToken: providerAccount.accessToken });
  }

  return auths;
}

async function getWorkspaceProviderAuth(organizationId: string, provider: GitProvider, integrationId?: string | null) {
  const auths = await getWorkspaceProviderAuths(organizationId, provider);

  if (integrationId) {
    return auths.find((auth) => auth.integrationId === integrationId) ?? null;
  }

  return auths[0] ?? null;
}

async function findGitHubAuthForRepository(organizationId: string, parsed: ParsedGitRepository) {
  const auths = await getWorkspaceProviderAuths(organizationId, "github");

  for (const githubAuth of auths) {
    const lookup = await lookupGitRepository(parsed, githubAuth.accessToken);

    if (lookup.repository) {
      return { githubAuth, lookup };
    }
  }

  if (auths.length > 0) {
    return { githubAuth: auths[0], lookup: await lookupGitRepository(parsed, auths[0].accessToken) };
  }

  return { githubAuth: null, lookup: await lookupGitRepository(parsed) };
}

async function findProviderAuthForRepository(organizationId: string, parsed: ParsedGitRepository) {
  if (parsed.provider === "github") {
    return findGitHubAuthForRepository(organizationId, parsed);
  }

  const auths = await getWorkspaceProviderAuths(organizationId, parsed.provider);

  for (const providerAuth of auths) {
    if (parsed.provider === "gitea" && providerAuth.baseUrl !== parsed.apiBaseUrl) {
      continue;
    }

    const lookup = await lookupGitRepository(parsed, providerAuth.accessToken);

    if (lookup.repository) {
      return { githubAuth: providerAuth, lookup };
    }
  }

  if (auths.length > 0) {
    const auth = parsed.provider === "gitea" ? auths.find((item) => item.baseUrl === parsed.apiBaseUrl) : auths[0];

    if (auth) {
      return { githubAuth: auth, lookup: await lookupGitRepository(parsed, auth.accessToken) };
    }
  }

  return { githubAuth: null, lookup: await lookupGitRepository(parsed) };
}

function getGitLabProjectPath(repository: ParsedGitRepository) {
  return encodeURIComponent(`${repository.owner}/${repository.name}`);
}

function getGiteaApiBase(repository: ParsedGitRepository) {
  return repository.apiBaseUrl ?? new URL(repository.url).origin;
}

async function listRepositoryBranches(repository: ParsedGitRepository, accessToken?: string | null) {
  if (repository.provider === "github") {
    const response = accessToken
      ? await fetchGitHubPages(`https://api.github.com/repos/${repository.owner}/${repository.name}/branches?per_page=100`, accessToken)
      : await fetchJsonArrayPages(`https://api.github.com/repos/${repository.owner}/${repository.name}/branches?per_page=100`, githubHeaders(), 10);

    return response.ok ? response.items.flatMap((branch) => (typeof branch.name === "string" ? [branch.name] : [])) : [];
  }

  if (repository.provider === "gitlab") {
    const response = await fetchJsonArrayPages(`https://gitlab.com/api/v4/projects/${getGitLabProjectPath(repository)}/repository/branches?per_page=100`, providerHeaders("gitlab", accessToken), 10);

    return response.ok ? response.items.flatMap((branch) => (typeof branch.name === "string" ? [branch.name] : [])) : [];
  }

  if (repository.provider === "bitbucket") {
    const branches: string[] = [];
    let nextUrl: string | null = `https://api.bitbucket.org/2.0/repositories/${repository.owner}/${repository.name}/refs/branches?pagelen=100`;
    let page = 0;

    while (nextUrl && page < 10) {
      const result = await fetchJsonObject(nextUrl, providerHeaders("bitbucket", accessToken));

      if (!result.ok || !result.data) {
        break;
      }

      const values = Array.isArray(result.data.values) ? (result.data.values as Array<Record<string, unknown>>) : [];
      branches.push(...values.flatMap((branch) => (typeof branch.name === "string" ? [branch.name] : [])));
      nextUrl = typeof result.data.next === "string" ? result.data.next : null;
      page += 1;
    }

    return branches;
  }

  const response = await fetchJsonArrayPages(`${getGiteaApiBase(repository)}/api/v1/repos/${repository.owner}/${repository.name}/branches?limit=100`, providerHeaders("gitea", accessToken), 10);

  return response.ok ? response.items.flatMap((branch) => (typeof branch.name === "string" ? [branch.name] : [])) : [];
}

async function listRepositoryCommits(repository: ParsedGitRepository, branch: string, accessToken?: string | null) {
  if (repository.provider === "github") {
    const initialUrl = `https://api.github.com/repos/${repository.owner}/${repository.name}/commits?sha=${encodeURIComponent(branch)}&per_page=100`;

    if (!accessToken) {
      const response = await fetchJsonArrayPages(initialUrl, githubHeaders(), 1);

      return response;
    }

    return fetchGitHubPages(initialUrl, accessToken, 5);
  }

  if (repository.provider === "gitlab") {
    return fetchJsonArrayPages(`https://gitlab.com/api/v4/projects/${getGitLabProjectPath(repository)}/repository/commits?ref_name=${encodeURIComponent(branch)}&per_page=100`, providerHeaders("gitlab", accessToken), 5);
  }

  if (repository.provider === "bitbucket") {
    const items: Array<Record<string, unknown>> = [];
    let nextUrl: string | null = `https://api.bitbucket.org/2.0/repositories/${repository.owner}/${repository.name}/commits/${encodeURIComponent(branch)}?pagelen=100`;
    let page = 0;

    while (nextUrl && page < 5) {
      const result = await fetchJsonObject(nextUrl, providerHeaders("bitbucket", accessToken));

      if (!result.ok || !result.data) {
        return { ok: false, status: result.status, items };
      }

      const values = Array.isArray(result.data.values) ? (result.data.values as Array<Record<string, unknown>>) : [];
      items.push(...values);
      nextUrl = typeof result.data.next === "string" ? result.data.next : null;
      page += 1;
    }

    return { ok: true, status: 200, items };
  }

  return fetchJsonArrayPages(`${getGiteaApiBase(repository)}/api/v1/repos/${repository.owner}/${repository.name}/commits?sha=${encodeURIComponent(branch)}&limit=100`, providerHeaders("gitea", accessToken), 5);
}

async function lookupGitRepository(parsed: ParsedGitRepository, accessToken?: string | null): Promise<{ repository: GitRepositoryLookup | null; inaccessible: boolean }> {
  let result: Awaited<ReturnType<typeof fetchJsonObject>>;

  if (parsed.provider === "github") {
    result = await fetchJsonObject(`https://api.github.com/repos/${parsed.owner}/${parsed.name}`, githubHeaders(accessToken));
  } else if (parsed.provider === "gitlab") {
    result = await fetchJsonObject(`https://gitlab.com/api/v4/projects/${getGitLabProjectPath(parsed)}`, providerHeaders("gitlab", accessToken));
  } else if (parsed.provider === "bitbucket") {
    result = await fetchJsonObject(`https://api.bitbucket.org/2.0/repositories/${parsed.owner}/${parsed.name}`, providerHeaders("bitbucket", accessToken));
  } else {
    result = await fetchJsonObject(`${getGiteaApiBase(parsed)}/api/v1/repos/${parsed.owner}/${parsed.name}`, providerHeaders("gitea", accessToken));
  }

  if (!result.ok || !result.data) {
    return { repository: null, inaccessible: result.inaccessible };
  }

  const payload = result.data;
  const mainBranch = typeof payload.mainbranch === "string" ? payload.mainbranch : undefined;
  const defaultBranch = typeof payload.default_branch === "string" ? payload.default_branch : mainBranch ?? "main";
  const isPrivate = payload.private === true || payload.is_private === true || payload.visibility === "private";
  const links = payload.links && typeof payload.links === "object" ? (payload.links as Record<string, unknown>) : null;
  const htmlLink = links?.html && typeof links.html === "object" && typeof (links.html as Record<string, unknown>).href === "string" ? String((links.html as Record<string, unknown>).href) : undefined;
  const htmlUrl = typeof payload.html_url === "string" ? payload.html_url : typeof payload.web_url === "string" ? payload.web_url : htmlLink ?? parsed.url;

  return {
    repository: {
      ...parsed,
      url: htmlUrl,
      defaultBranch,
      isPrivate
    },
    inaccessible: false
  };
}

function normalizeCommit(provider: GitProvider, entry: Record<string, unknown>) {
  if (provider === "gitlab") {
    const sha = typeof entry.id === "string" ? entry.id : null;

    return {
      sha,
      message: typeof entry.message === "string" ? entry.message : "",
      authorName: typeof entry.author_name === "string" ? entry.author_name : null,
      authorEmail: typeof entry.author_email === "string" ? entry.author_email : null,
      committedAt: typeof entry.committed_date === "string" ? entry.committed_date : null,
      url: typeof entry.web_url === "string" ? entry.web_url : null
    };
  }

  if (provider === "bitbucket") {
    const author = entry.author && typeof entry.author === "object" ? (entry.author as Record<string, unknown>) : null;
    const user = author?.user && typeof author.user === "object" ? (author.user as Record<string, unknown>) : null;
    const links = entry.links && typeof entry.links === "object" ? (entry.links as Record<string, unknown>) : null;
    const html = links?.html && typeof links.html === "object" ? (links.html as Record<string, unknown>) : null;

    return {
      sha: typeof entry.hash === "string" ? entry.hash : null,
      message: typeof entry.message === "string" ? entry.message : "",
      authorName: typeof user?.display_name === "string" ? user.display_name : typeof author?.raw === "string" ? author.raw : null,
      authorEmail: null,
      committedAt: typeof entry.date === "string" ? entry.date : null,
      url: typeof html?.href === "string" ? html.href : null
    };
  }

  const commitDetail = entry.commit && typeof entry.commit === "object" ? (entry.commit as Record<string, unknown>) : {};
  const authorDetail = commitDetail.author && typeof commitDetail.author === "object" ? (commitDetail.author as Record<string, unknown>) : {};

  return {
    sha: typeof entry.sha === "string" ? entry.sha : null,
    message: typeof commitDetail.message === "string" ? commitDetail.message : typeof entry.message === "string" ? entry.message : "",
    authorName: typeof authorDetail.name === "string" ? authorDetail.name : null,
    authorEmail: typeof authorDetail.email === "string" ? authorDetail.email : null,
    committedAt: typeof authorDetail.date === "string" ? authorDetail.date : null,
    url: typeof entry.html_url === "string" ? entry.html_url : typeof entry.url === "string" ? entry.url : null
  };
}

export async function searchGitHubRepositories(query: string): Promise<{ status: "success" | "error"; message: string; repositories: GitHubRepositorySearchResult[] }> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to search repositories.", repositories: [] };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const providerAuths = await getWorkspaceProviderAuths(organization.id);

  if (providerAuths.length === 0) {
    return { status: "error", message: "Connect a Git provider account to this workspace first.", repositories: [] };
  }

  const normalizedQuery = query.trim().toLowerCase().slice(0, 80);
  const repositoryMap = new Map<string, GitHubRepositorySearchResult>();

  for (const providerAuth of providerAuths) {
    if (providerAuth.provider === "github") {
      const response = await fetchGitHubPages("https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&visibility=all&sort=updated&per_page=100", providerAuth.accessToken);

      if (!response.ok) {
        continue;
      }

      for (const repository of response.items) {
        const fullName = typeof repository.full_name === "string" ? repository.full_name : "";
        const owner = repository.owner && typeof repository.owner === "object" && typeof (repository.owner as Record<string, unknown>).login === "string" ? String((repository.owner as Record<string, unknown>).login) : fullName.split("/")[0];
        const name = typeof repository.name === "string" ? repository.name : fullName.split("/")[1];
        const url = typeof repository.html_url === "string" ? repository.html_url : owner && name ? `https://github.com/${owner}/${name}` : "";
        const defaultBranch = typeof repository.default_branch === "string" ? repository.default_branch : "main";
        const description = typeof repository.description === "string" ? repository.description : null;

        if (!owner || !name || !url) {
          continue;
        }

        repositoryMap.set(`github:${owner}/${name}`.toLowerCase(), { provider: "github", owner, name, fullName: `${owner}/${name}`, url, defaultBranch, isPrivate: repository.private === true, description });
      }

      continue;
    }

    if (providerAuth.provider === "gitlab") {
      const response = await fetchJsonArrayPages("https://gitlab.com/api/v4/projects?membership=true&simple=true&per_page=100&order_by=last_activity_at", providerHeaders("gitlab", providerAuth.accessToken), 10);

      if (!response.ok) {
        continue;
      }

      for (const repository of response.items) {
        const path = typeof repository.path_with_namespace === "string" ? repository.path_with_namespace : "";
        const parts = path.split("/");
        const name = parts.at(-1) ?? "";
        const owner = parts.slice(0, -1).join("/");
        const url = typeof repository.web_url === "string" ? repository.web_url : owner && name ? `https://gitlab.com/${owner}/${name}` : "";
        const defaultBranch = typeof repository.default_branch === "string" ? repository.default_branch : "main";
        const description = typeof repository.description === "string" ? repository.description : null;

        if (!owner || !name || !url) {
          continue;
        }

        repositoryMap.set(`gitlab:${owner}/${name}`.toLowerCase(), { provider: "gitlab", owner, name, fullName: `${owner}/${name}`, url, defaultBranch, isPrivate: repository.visibility === "private", description });
      }

      continue;
    }

    if (providerAuth.provider === "gitea") {
      if (!providerAuth.baseUrl) {
        continue;
      }

      const search = encodeURIComponent(normalizedQuery || "");
      const response = await fetchJsonObject(`${providerAuth.baseUrl}/api/v1/repos/search?limit=50${search ? `&q=${search}` : ""}`, providerHeaders("gitea", providerAuth.accessToken));

      if (!response.ok || !response.data) {
        continue;
      }

      const values = Array.isArray(response.data.data) ? (response.data.data as Array<Record<string, unknown>>) : [];

      for (const repository of values) {
        const fullName = typeof repository.full_name === "string" ? repository.full_name : "";
        const [owner, name] = fullName.split("/");
        const url = typeof repository.html_url === "string" ? repository.html_url : owner && name ? `${providerAuth.baseUrl}/${owner}/${name}` : "";
        const defaultBranch = typeof repository.default_branch === "string" ? repository.default_branch : "main";
        const description = typeof repository.description === "string" ? repository.description : null;

        if (!owner || !name || !url) {
          continue;
        }

        repositoryMap.set(`gitea:${providerAuth.baseUrl}:${owner}/${name}`.toLowerCase(), { provider: "gitea", owner, name, fullName: `${owner}/${name}`, url, defaultBranch, isPrivate: repository.private === true, description });
      }

      continue;
    }

    let nextUrl: string | null = "https://api.bitbucket.org/2.0/repositories?role=member&pagelen=100";
    let page = 0;

    while (nextUrl && page < 10) {
      const response = await fetchJsonObject(nextUrl, providerHeaders("bitbucket", providerAuth.accessToken));

      if (!response.ok || !response.data) {
        break;
      }

      const values = Array.isArray(response.data.values) ? (response.data.values as Array<Record<string, unknown>>) : [];

      for (const repository of values) {
        const fullName = typeof repository.full_name === "string" ? repository.full_name : "";
        const owner = typeof repository.workspace === "object" && repository.workspace && typeof (repository.workspace as Record<string, unknown>).slug === "string" ? String((repository.workspace as Record<string, unknown>).slug) : fullName.split("/")[0];
        const name = typeof repository.slug === "string" ? repository.slug : fullName.split("/")[1];
        const links = repository.links && typeof repository.links === "object" ? (repository.links as Record<string, unknown>) : null;
        const html = links?.html && typeof links.html === "object" ? (links.html as Record<string, unknown>) : null;
        const url = typeof html?.href === "string" ? html.href : owner && name ? `https://bitbucket.org/${owner}/${name}` : "";
        const mainbranch = repository.mainbranch && typeof repository.mainbranch === "object" ? (repository.mainbranch as Record<string, unknown>) : null;
        const defaultBranch = typeof mainbranch?.name === "string" ? mainbranch.name : "main";
        const description = typeof repository.description === "string" ? repository.description : null;

        if (!owner || !name || !url) {
          continue;
        }

        repositoryMap.set(`bitbucket:${owner}/${name}`.toLowerCase(), { provider: "bitbucket", owner, name, fullName: `${owner}/${name}`, url, defaultBranch, isPrivate: repository.is_private === true, description });
      }

      nextUrl = typeof response.data.next === "string" ? response.data.next : null;
      page += 1;
    }
  }

  if (repositoryMap.size === 0) {
    return { status: "error", message: "Repository lookup failed. Reconnect your Git provider accounts and try again.", repositories: [] };
  }

  const repositories = Array.from(repositoryMap.values())
    .filter((repository) => !normalizedQuery || repository.fullName.toLowerCase().includes(normalizedQuery) || (repository.description ?? "").toLowerCase().includes(normalizedQuery))
    .slice(0, 25);

  return { status: "success", message: "", repositories };
}

export async function getGitHubBranches(provider: GitProvider, owner: string, name: string, url: string): Promise<{ status: "success" | "error"; message: string; branches: string[] }> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to load branches.", branches: [] };
  }

  const parsed = parseGitRepositoryReference(provider, owner, name, url);

  if (!parsed) {
    return { status: "error", message: "Invalid Git repository.", branches: [] };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const providerAuth = parsed.provider === "gitea" ? null : (await getWorkspaceProviderAuths(organization.id, parsed.provider)).find((auth) => auth.provider === parsed.provider) ?? null;

  if (parsed.provider !== "gitea" && !providerAuth) {
    return { status: "error", message: `Connect ${parsed.provider} repository access to this workspace first.`, branches: [] };
  }

  const branches = await listRepositoryBranches(parsed, providerAuth?.accessToken);

  if (branches.length === 0) {
    return { status: "error", message: "No branches were returned by the Git provider.", branches: [] };
  }

  return { status: "success", message: "", branches };
}

export async function attachRepository(_: RepositoryFormState, formData: FormData): Promise<RepositoryFormState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to attach a repository." };
  }

  const projectId = String(formData.get("projectId") ?? "");
  const repositoryInput = String(formData.get("repositoryUrl") ?? "").trim();
  const selectedBranch = String(formData.get("selectedBranch") ?? "").trim();

  if (!projectId) {
    return { status: "error", message: "Choose a project first." };
  }

  const parsed = parseGitRepository(repositoryInput);

  if (!parsed) {
    return { status: "error", message: "Enter a GitHub, GitLab, Bitbucket, or Gitea repository URL. GitHub also accepts owner/repo." };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [project] = await db
    .select({ id: projects.id, slug: projects.slug })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organization.id)))
    .limit(1);

  if (!project) {
    return { status: "error", message: "Project not found in the active workspace." };
  }

  const { githubAuth, lookup } = await findProviderAuthForRepository(organization.id, parsed);

  if (!lookup.repository) {
    if (lookup.inaccessible) {
      return { status: "error", message: "That repository is private or unavailable. Connect GitHub for private GitHub repositories, or use a public repository URL." };
    }

    return { status: "error", message: "The Git provider did not return repository details. Check the URL and try again." };
  }

  if (lookup.repository.isPrivate && !githubAuth) {
    return { status: "error", message: `Private repositories require ${lookup.repository.provider} repository access connected to this workspace.` };
  }

  const branch = selectedBranch || lookup.repository.defaultBranch;

  if (!/^[A-Za-z0-9._/-]{1,255}$/.test(branch)) {
    return { status: "error", message: "Selected branch contains unsupported characters." };
  }

  if (githubAuth) {
    const branches = await listRepositoryBranches(lookup.repository, githubAuth.accessToken);

    if (branches.length > 0 && !branches.includes(branch)) {
      return { status: "error", message: "Selected branch was not found on the Git provider." };
    }
  }

  const [existing] = await db
    .select({ id: repositories.id })
    .from(repositories)
    .where(and(eq(repositories.projectId, project.id), eq(repositories.provider, lookup.repository.provider), eq(repositories.owner, lookup.repository.owner), eq(repositories.name, lookup.repository.name)))
    .limit(1);

  if (existing) {
    return { status: "error", message: "This repository is already attached to that project." };
  }

  await db.insert(repositories).values({
    id: crypto.randomUUID(),
    projectId: project.id,
    provider: lookup.repository.provider,
    integrationId: githubAuth?.integrationId,
    owner: lookup.repository.owner,
    name: lookup.repository.name,
    url: lookup.repository.url,
    defaultBranch: branch,
    isPrivate: lookup.repository.isPrivate
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/repositories");
  revalidatePath(`/dashboard/projects/${project.slug}/repositories`);

  return { status: "success", message: `Attached ${lookup.repository.owner}/${lookup.repository.name} on ${branch}.` };
}

export type SyncCommitsFormState = {
  status: "idle" | "success" | "error";
  message: string;
  newCommits: number;
};

export async function syncRepositoryCommits(repositoryId: string): Promise<SyncCommitsFormState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to sync commits.", newCommits: 0 };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [repository] = await db
    .select({
      id: repositories.id,
      projectId: repositories.projectId,
      projectSlug: projects.slug,
      provider: repositories.provider,
      owner: repositories.owner,
      name: repositories.name,
      url: repositories.url,
      defaultBranch: repositories.defaultBranch,
      isPrivate: repositories.isPrivate,
      integrationId: repositories.integrationId
    })
    .from(repositories)
    .innerJoin(projects, eq(repositories.projectId, projects.id))
    .where(and(eq(repositories.id, repositoryId), eq(projects.organizationId, organization.id)))
    .limit(1);

  if (!repository) {
    return { status: "error", message: "Repository not found in the active workspace.", newCommits: 0 };
  }

  if (!isValidOwnerPath(repository.owner) || !isValidPathSegment(repository.name)) {
    return { status: "error", message: "Invalid repository metadata.", newCommits: 0 };
  }

  if (!/^[A-Za-z0-9._/-]{1,255}$/.test(repository.defaultBranch)) {
    return { status: "error", message: "Default branch contains unsupported characters.", newCommits: 0 };
  }

  const parsedRepository = parseGitRepositoryReference(repository.provider, repository.owner, repository.name, repository.url);

  if (!parsedRepository) {
    return { status: "error", message: "Invalid repository URL metadata.", newCommits: 0 };
  }

  const githubAuth = await getWorkspaceProviderAuth(organization.id, repository.provider, repository.integrationId);

  if (repository.isPrivate && !githubAuth) {
    return { status: "error", message: `Private repositories require ${repository.provider} repository access connected to this workspace.`, newCommits: 0 };
  }

  const response = await listRepositoryCommits(parsedRepository, repository.defaultBranch, githubAuth?.accessToken);

  if (!response.ok) {
    return { status: "error", message: `Git provider returned ${response.status}. Check repository access and try again.`, newCommits: 0 };
  }

  const payload = response.items;
  let inserted = 0;

  for (const entry of payload) {
    const commit = normalizeCommit(repository.provider, entry);
    const sha = commit.sha;

    if (!sha) {
      continue;
    }

    const existing = await db
      .select({ id: commits.id })
      .from(commits)
      .where(and(eq(commits.repositoryId, repository.id), eq(commits.sha, sha)))
      .limit(1);

    if (existing.length > 0) {
      continue;
    }

    await db.insert(commits).values({
      id: crypto.randomUUID(),
      repositoryId: repository.id,
      sha,
      message: commit.message.slice(0, 2048),
      authorName: commit.authorName,
      authorEmail: commit.authorEmail,
      committedAt: commit.committedAt ? new Date(commit.committedAt) : null,
      url: commit.url,
      metadata: {
        syncedAt: new Date().toISOString(),
        branch: repository.defaultBranch
      }
    });

    inserted += 1;
  }

  await db
    .update(repositories)
    .set({ updatedAt: new Date() })
    .where(eq(repositories.id, repository.id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${repository.projectSlug}`);
  revalidatePath(`/dashboard/projects/${repository.projectSlug}/repositories`);
  revalidatePath(`/dashboard/projects/${repository.projectSlug}/repositories/${repository.id}`);
  revalidatePath(`/dashboard/projects/${repository.projectSlug}/changelogs`);

  return {
    status: "success",
    message: inserted === 0 ? "Repository is up to date. No new commits found." : `Synced ${inserted} new commit${inserted === 1 ? "" : "s"}.`,
    newCommits: inserted
  };
}

export async function getRepositoryDetailData(repositoryId: string) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [repository] = await db
    .select({
      id: repositories.id,
      projectId: repositories.projectId,
      projectSlug: projects.slug,
      provider: repositories.provider,
      owner: repositories.owner,
      name: repositories.name,
      url: repositories.url,
      defaultBranch: repositories.defaultBranch,
      isPrivate: repositories.isPrivate,
      updatedAt: repositories.updatedAt
    })
    .from(repositories)
    .innerJoin(projects, eq(repositories.projectId, projects.id))
    .where(and(eq(repositories.id, repositoryId), eq(projects.organizationId, organization.id)))
    .limit(1);

  if (!repository) {
    return null;
  }

  return {
    repository: {
      id: repository.id,
      provider: repository.provider,
      owner: repository.owner,
      name: repository.name,
      url: repository.url,
      defaultBranch: repository.defaultBranch,
      isPrivate: repository.isPrivate,
      updatedAt: repository.updatedAt
    },
    project: {
      id: repository.projectId,
      slug: repository.projectSlug
    }
  };
}
