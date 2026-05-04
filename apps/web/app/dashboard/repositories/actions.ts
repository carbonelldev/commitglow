"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { account, commits, integrations, projects, repositories } from "@commitglow/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export type RepositoryFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type GitHubRepositorySearchResult = {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
};

type ParsedGitHubRepository = {
  owner: string;
  name: string;
  url: string;
};

type GitHubRepositoryLookup = ParsedGitHubRepository & {
  defaultBranch: string;
  isPrivate: boolean;
};

type WorkspaceGitHubAuth = {
  integrationId: string;
  accessToken: string;
};

function parseGitHubRepository(value: string): ParsedGitHubRepository | null {
  const trimmed = value.trim().replace(/\.git$/i, "");

  if (/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    const [owner, name] = trimmed.split("/");

    return { owner, name, url: `https://github.com/${owner}/${name}` };
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    return null;
  }

  const [owner, repoName, extra] = url.pathname.replace(/^\/+|\/+$/g, "").split("/");

  if (!owner || !repoName || extra) {
    return null;
  }

  const name = repoName.replace(/\.git$/i, "");

  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(name)) {
    return null;
  }

  return {
    owner,
    name,
    url: `https://github.com/${owner}/${name}`
  };
}

function hasRepositoryScope(value: string | null | undefined) {
  return (value ?? "").split(/[\s,]+/).includes("repo");
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

async function fetchGitHubPages(initialUrl: string, accessToken: string, maxPages = 10) {
  const items: Array<Record<string, unknown>> = [];
  let nextUrl: string | null = initialUrl;
  let page = 0;

  while (nextUrl && page < maxPages) {
    const response = await fetch(nextUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "CommitGlow",
        "X-GitHub-Api-Version": "2022-11-28"
      },
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

async function getWorkspaceGitHubAuths(organizationId: string): Promise<WorkspaceGitHubAuth[]> {
  const workspaceIntegrations = await db
    .select({ id: integrations.id, userId: integrations.userId, providerAccountId: integrations.providerAccountId, metadata: integrations.metadata, updatedAt: integrations.updatedAt })
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "github")))
    .orderBy(desc(integrations.updatedAt));
  const explicitIntegrations = workspaceIntegrations.filter((item) => isExplicitProviderConnection(item.metadata) && item.providerAccountId);
  const auths: WorkspaceGitHubAuth[] = [];

  for (const integration of explicitIntegrations) {
    const [githubAccount] = await db
      .select({ accessToken: account.accessToken, scope: account.scope })
      .from(account)
      .where(and(eq(account.userId, integration.userId), eq(account.providerId, "github"), eq(account.accountId, integration.providerAccountId!)))
      .limit(1);

    if (!githubAccount?.accessToken || !hasRepositoryScope(githubAccount.scope)) {
      continue;
    }

    auths.push({ integrationId: integration.id, accessToken: githubAccount.accessToken });
  }

  return auths;
}

async function getWorkspaceGitHubAuth(organizationId: string, integrationId?: string | null) {
  const auths = await getWorkspaceGitHubAuths(organizationId);

  if (integrationId) {
    return auths.find((auth) => auth.integrationId === integrationId) ?? null;
  }

  return auths[0] ?? null;
}

async function findGitHubAuthForRepository(organizationId: string, parsed: ParsedGitHubRepository) {
  const auths = await getWorkspaceGitHubAuths(organizationId);

  for (const githubAuth of auths) {
    const lookup = await lookupGitHubRepository(parsed, githubAuth.accessToken);

    if (lookup.repository) {
      return { githubAuth, lookup };
    }
  }

  if (auths.length > 0) {
    return { githubAuth: auths[0], lookup: await lookupGitHubRepository(parsed, auths[0].accessToken) };
  }

  return { githubAuth: null, lookup: await lookupGitHubRepository(parsed) };
}

async function listGitHubBranches(owner: string, name: string, accessToken: string) {
  const response = await fetchGitHubPages(`https://api.github.com/repos/${owner}/${name}/branches?per_page=100`, accessToken);

  if (!response.ok) {
    return [];
  }

  return response.items.flatMap((branch) => (typeof branch.name === "string" ? [branch.name] : []));
}

async function listGitHubCommits(owner: string, name: string, branch: string, accessToken?: string | null) {
  const initialUrl = `https://api.github.com/repos/${owner}/${name}/commits?sha=${encodeURIComponent(branch)}&per_page=100`;

  if (!accessToken) {
    const response = await fetch(initialUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "CommitGlow",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return { ok: false, status: response.status, items: [] as Array<Record<string, unknown>> };
    }

    const payload = (await response.json()) as unknown;

    return { ok: Array.isArray(payload), status: response.status, items: Array.isArray(payload) ? (payload as Array<Record<string, unknown>>) : [] };
  }

  return fetchGitHubPages(initialUrl, accessToken, 5);
}

async function lookupGitHubRepository(parsed: ParsedGitHubRepository, accessToken?: string | null): Promise<{ repository: GitHubRepositoryLookup | null; inaccessible: boolean }> {
  const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.name}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "CommitGlow",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    cache: "no-store"
  });

  if (response.status === 404 || response.status === 403) {
    return { repository: null, inaccessible: true };
  }

  if (!response.ok) {
    return { repository: null, inaccessible: false };
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const defaultBranch = typeof payload.default_branch === "string" ? payload.default_branch : "main";
  const isPrivate = payload.private === true;
  const htmlUrl = typeof payload.html_url === "string" ? payload.html_url : parsed.url;

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

export async function searchGitHubRepositories(query: string): Promise<{ status: "success" | "error"; message: string; repositories: GitHubRepositorySearchResult[] }> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to search repositories.", repositories: [] };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const githubAuths = await getWorkspaceGitHubAuths(organization.id);

  if (githubAuths.length === 0) {
    return { status: "error", message: "Connect GitHub repository access to this workspace first.", repositories: [] };
  }

  const normalizedQuery = query.trim().toLowerCase().slice(0, 80);
  const repositoryMap = new Map<string, GitHubRepositorySearchResult>();

  for (const githubAuth of githubAuths) {
    const response = await fetchGitHubPages("https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&visibility=all&sort=updated&per_page=100", githubAuth.accessToken);

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

      repositoryMap.set(`${owner}/${name}`.toLowerCase(), { owner, name, fullName: `${owner}/${name}`, url, defaultBranch, isPrivate: repository.private === true, description });
    }
  }

  if (repositoryMap.size === 0) {
    return { status: "error", message: "GitHub repository lookup failed. Reconnect GitHub and try again.", repositories: [] };
  }

  const repositories = Array.from(repositoryMap.values())
    .filter((repository) => !normalizedQuery || repository.fullName.toLowerCase().includes(normalizedQuery) || (repository.description ?? "").toLowerCase().includes(normalizedQuery))
    .slice(0, 25);

  return { status: "success", message: "", repositories };
}

export async function getGitHubBranches(owner: string, name: string): Promise<{ status: "success" | "error"; message: string; branches: string[] }> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to load branches.", branches: [] };
  }

  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(name)) {
    return { status: "error", message: "Invalid GitHub repository.", branches: [] };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const parsed = { owner, name, url: `https://github.com/${owner}/${name}` };
  const { githubAuth } = await findGitHubAuthForRepository(organization.id, parsed);

  if (!githubAuth) {
    return { status: "error", message: "Connect GitHub repository access to this workspace first.", branches: [] };
  }

  const branches = await listGitHubBranches(owner, name, githubAuth.accessToken);

  if (branches.length === 0) {
    return { status: "error", message: "No branches were returned by GitHub.", branches: [] };
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

  const parsed = parseGitHubRepository(repositoryInput);

  if (!parsed) {
    return { status: "error", message: "Enter a GitHub repository as owner/repo or https://github.com/owner/repo." };
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

  const { githubAuth, lookup } = await findGitHubAuthForRepository(organization.id, parsed);

  if (!lookup.repository) {
    if (lookup.inaccessible) {
      return { status: "error", message: "That repository is private or unavailable. Connect GitHub repository access to this workspace, then try again." };
    }

    return { status: "error", message: "GitHub did not return repository details. Try again in a moment." };
  }

  if (lookup.repository.isPrivate && !githubAuth) {
    return { status: "error", message: "Private repositories require GitHub repository access connected to this workspace." };
  }

  const branch = selectedBranch || lookup.repository.defaultBranch;

  if (!/^[A-Za-z0-9._/-]{1,255}$/.test(branch)) {
    return { status: "error", message: "Selected branch contains unsupported characters." };
  }

  if (githubAuth) {
    const branches = await listGitHubBranches(lookup.repository.owner, lookup.repository.name, githubAuth.accessToken);

    if (branches.length > 0 && !branches.includes(branch)) {
      return { status: "error", message: "Selected branch was not found on GitHub." };
    }
  }

  const [existing] = await db
    .select({ id: repositories.id })
    .from(repositories)
    .where(and(eq(repositories.projectId, project.id), eq(repositories.provider, "github"), eq(repositories.owner, lookup.repository.owner), eq(repositories.name, lookup.repository.name)))
    .limit(1);

  if (existing) {
    return { status: "error", message: "This repository is already attached to that project." };
  }

  await db.insert(repositories).values({
    id: crypto.randomUUID(),
    projectId: project.id,
    provider: "github",
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
      owner: repositories.owner,
      name: repositories.name,
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

  if (!/^[A-Za-z0-9_.-]+$/.test(repository.owner) || !/^[A-Za-z0-9_.-]+$/.test(repository.name)) {
    return { status: "error", message: "Invalid repository metadata.", newCommits: 0 };
  }

  if (!/^[A-Za-z0-9._/-]{1,255}$/.test(repository.defaultBranch)) {
    return { status: "error", message: "Default branch contains unsupported characters.", newCommits: 0 };
  }

  const githubAuth = await getWorkspaceGitHubAuth(organization.id, repository.integrationId);

  if (repository.isPrivate && !githubAuth) {
    return { status: "error", message: "Private repositories require GitHub repository access connected to this workspace.", newCommits: 0 };
  }

  const response = await listGitHubCommits(repository.owner, repository.name, repository.defaultBranch, githubAuth?.accessToken);

  if (!response.ok) {
    return { status: "error", message: `GitHub returned ${response.status}. Check repository access and try again.`, newCommits: 0 };
  }

  const payload = response.items;
  let inserted = 0;

  for (const entry of payload) {
    const sha = typeof entry.sha === "string" ? entry.sha : null;

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

    const commitDetail = (entry.commit as Record<string, unknown>) ?? {};
    const message = typeof commitDetail.message === "string" ? commitDetail.message : "";
    const authorDetail = (commitDetail.author as Record<string, unknown>) ?? {};
    const authorName = typeof authorDetail.name === "string" ? authorDetail.name : null;
    const authorEmail = typeof authorDetail.email === "string" ? authorDetail.email : null;
    const committedAtValue = typeof authorDetail.date === "string" ? authorDetail.date : null;
    const htmlUrl = typeof entry.html_url === "string" ? entry.html_url : null;

    await db.insert(commits).values({
      id: sha,
      repositoryId: repository.id,
      sha,
      message: message.slice(0, 2048),
      authorName,
      authorEmail,
      committedAt: committedAtValue ? new Date(committedAtValue) : null,
      url: htmlUrl,
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

  return {
    status: "success",
    message: inserted === 0 ? "Repository is up to date. No new commits found." : `Synced ${inserted} new commit${inserted === 1 ? "" : "s"}.`,
    newCommits: inserted
  };
}
