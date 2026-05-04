"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { account, integrations, projects, repositories } from "@commitglow/db/schema";
import { and, eq } from "drizzle-orm";
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

async function getWorkspaceGitHubAuth(userId: string, organizationId: string) {
  const workspaceIntegrations = await db
    .select({ providerAccountId: integrations.providerAccountId, metadata: integrations.metadata })
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "github")));
  const integration = workspaceIntegrations.find((item) => isExplicitProviderConnection(item.metadata));

  if (!integration?.providerAccountId) {
    return null;
  }

  const [githubAccount] = await db
    .select({ accessToken: account.accessToken, scope: account.scope })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github"), eq(account.accountId, integration.providerAccountId)))
    .limit(1);

  if (!githubAccount?.accessToken || !hasRepositoryScope(githubAccount.scope)) {
    return null;
  }

  return { accessToken: githubAccount.accessToken };
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

async function listGitHubBranches(owner: string, name: string, accessToken: string) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}/branches?per_page=100`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "CommitGlow",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as Array<Record<string, unknown>>;

  return payload.flatMap((branch) => (typeof branch.name === "string" ? [branch.name] : []));
}

export async function searchGitHubRepositories(query: string): Promise<{ status: "success" | "error"; message: string; repositories: GitHubRepositorySearchResult[] }> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to search repositories.", repositories: [] };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const githubAuth = await getWorkspaceGitHubAuth(session.user.id, organization.id);

  if (!githubAuth) {
    return { status: "error", message: "Connect GitHub repository access to this workspace first.", repositories: [] };
  }

  const normalizedQuery = query.trim().toLowerCase().slice(0, 80);
  const response = await fetch("https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&visibility=all&sort=updated&per_page=100", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubAuth.accessToken}`,
      "User-Agent": "CommitGlow",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return { status: "error", message: "GitHub repository lookup failed. Reconnect GitHub and try again.", repositories: [] };
  }

  const payload = (await response.json()) as Array<Record<string, unknown>>;
  const repositories = payload
    .flatMap((repository): GitHubRepositorySearchResult[] => {
      const fullName = typeof repository.full_name === "string" ? repository.full_name : "";
      const owner = repository.owner && typeof repository.owner === "object" && typeof (repository.owner as Record<string, unknown>).login === "string" ? String((repository.owner as Record<string, unknown>).login) : fullName.split("/")[0];
      const name = typeof repository.name === "string" ? repository.name : fullName.split("/")[1];
      const url = typeof repository.html_url === "string" ? repository.html_url : owner && name ? `https://github.com/${owner}/${name}` : "";
      const defaultBranch = typeof repository.default_branch === "string" ? repository.default_branch : "main";
      const description = typeof repository.description === "string" ? repository.description : null;

      if (!owner || !name || !url) {
        return [];
      }

      return [{ owner, name, fullName: `${owner}/${name}`, url, defaultBranch, isPrivate: repository.private === true, description }];
    })
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
  const githubAuth = await getWorkspaceGitHubAuth(session.user.id, organization.id);

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

  const githubAuth = await getWorkspaceGitHubAuth(session.user.id, organization.id);
  const lookup = await lookupGitHubRepository(parsed, githubAuth?.accessToken);

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
