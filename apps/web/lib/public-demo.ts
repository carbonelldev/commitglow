import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { aiConfigured, changelogModel, changelogSystemPrompt, changelogUserPrompt } from "@/lib/ai";
import { db } from "@/lib/db";
import { demoGenerationCache } from "@commitglow/db/schema";
import { eq } from "drizzle-orm";

export type PublicGitProvider = "github" | "gitlab" | "bitbucket" | "gitea";

export type DemoCommit = {
  sha: string;
  message: string;
  authorName: string | null;
  committedAt: string | null;
  url: string | null;
};

export type PublicDemoSuccess = {
  status: "success";
  provider: PublicGitProvider;
  repo: string;
  repoUrl: string;
  description: string | null;
  defaultBranch: string;
  commits: DemoCommit[];
  body: string;
  aiGenerated: boolean;
  cached: boolean;
  reasoningTrace: string;
};

export type PublicDemoResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | PublicDemoSuccess;

type ParsedPublicRepository = {
  provider: PublicGitProvider;
  owner: string;
  name: string;
  url: string;
  apiBaseUrl?: string;
};

export type RepositoryLookup = ParsedPublicRepository & {
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
};

function isValidPathSegment(value: string) {
  return /^[A-Za-z0-9_.-]+$/.test(value);
}

function isValidOwnerPath(value: string) {
  return value.split("/").every(isValidPathSegment);
}

function isBlockedRepositoryHost(hostname: string) {
  const host = hostname.toLowerCase();

  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || isBlockedIpAddress(host);
}

function getIpv4Octets(value: string) {
  if (isIP(value) !== 4) {
    return null;
  }

  const octets = value.split(".").map(Number);

  return octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) ? octets : null;
}

function isBlockedIpv4(value: string) {
  const octets = getIpv4Octets(value);

  if (!octets) {
    return false;
  }

  const [first, second] = octets;

  return first === 0 || first === 10 || first === 127 || (first === 100 && second >= 64 && second <= 127) || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168) || (first === 198 && (second === 18 || second === 19));
}

function isBlockedIpAddress(value: string) {
  const ip = value.replace(/^\[|\]$/g, "").toLowerCase();

  if (isBlockedIpv4(ip)) {
    return true;
  }

  const mappedIpv4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  if (mappedIpv4 && isBlockedIpv4(mappedIpv4)) {
    return true;
  }

  if (isIP(ip) !== 6) {
    return false;
  }

  return ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || /^fe[89ab]/.test(ip);
}

async function isBlockedRepositoryEndpoint(origin: string) {
  const url = new URL(origin);

  if (isBlockedRepositoryHost(url.hostname)) {
    return true;
  }

  try {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });

    return addresses.some((address) => isBlockedIpAddress(address.address));
  } catch {
    return true;
  }
}

function headersFor(provider: PublicGitProvider): HeadersInit {
  if (provider === "github") {
    return {
      Accept: "application/vnd.github+json",
      "User-Agent": "CommitGlow Demo",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  return {
    Accept: "application/json",
    "User-Agent": "CommitGlow Demo",
  };
}

function parseProviderPrefix(value: string): ParsedPublicRepository | null {
  const match = value.match(/^(github|gitlab|bitbucket):(.+)$/i);

  if (!match) {
    return null;
  }

  const provider = match[1].toLowerCase() as PublicGitProvider;
  const reference = match[2].replace(/\.git$/i, "").replace(/\/$/, "");
  const parts = reference.split("/").filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const name = parts.at(-1)!;
  const owner = parts.slice(0, -1).join("/");

  if (!isValidOwnerPath(owner) || !isValidPathSegment(name)) {
    return null;
  }

  if (provider === "github" && parts.length === 2) {
    return { provider, owner, name, url: `https://github.com/${owner}/${name}` };
  }

  if (provider === "gitlab") {
    return { provider, owner, name, url: `https://gitlab.com/${owner}/${name}` };
  }

  if (provider === "bitbucket" && parts.length === 2) {
    return { provider, owner, name, url: `https://bitbucket.org/${owner}/${name}` };
  }

  return null;
}

export function parsePublicRepositoryInput(value: string): ParsedPublicRepository[] {
  const trimmed = value.trim().replace(/\.git$/i, "").replace(/\/$/, "");
  const prefixed = parseProviderPrefix(trimmed);

  if (prefixed) {
    return [prefixed];
  }

  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    const [owner, name] = trimmed.split("/");

    return [
      { provider: "github", owner, name, url: `https://github.com/${owner}/${name}` },
      { provider: "gitlab", owner, name, url: `https://gitlab.com/${owner}/${name}` },
      { provider: "bitbucket", owner, name, url: `https://bitbucket.org/${owner}/${name}` },
    ];
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return [];
  }

  if (url.protocol !== "https:" || url.username || url.password || isBlockedRepositoryHost(url.hostname)) {
    return [];
  }

  const hostname = url.hostname.toLowerCase();
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

  if (parts.length < 2) {
    return [];
  }

  const name = parts.at(-1)!.replace(/\.git$/i, "");
  const owner = parts.slice(0, -1).join("/");

  if (!isValidOwnerPath(owner) || !isValidPathSegment(name)) {
    return [];
  }

  if (hostname === "github.com" && parts.length === 2) {
    return [{ provider: "github", owner, name, url: `https://github.com/${owner}/${name}` }];
  }

  if (hostname === "gitlab.com") {
    return [{ provider: "gitlab", owner, name, url: `https://gitlab.com/${owner}/${name}` }];
  }

  if (hostname === "bitbucket.org" && parts.length === 2) {
    return [{ provider: "bitbucket", owner, name, url: `https://bitbucket.org/${owner}/${name}` }];
  }

  if (parts.length === 2) {
    const origin = `${url.protocol}//${url.host}`;

    return [{ provider: "gitea", owner, name, url: `${origin}/${owner}/${name}`, apiBaseUrl: origin }];
  }

  return [];
}

function getGitLabProjectPath(repository: ParsedPublicRepository) {
  return encodeURIComponent(`${repository.owner}/${repository.name}`);
}

function getGiteaApiBase(repository: ParsedPublicRepository) {
  return repository.apiBaseUrl ?? new URL(repository.url).origin;
}

async function fetchJsonObject(url: string, headers: HeadersInit) {
  const response = await fetch(url, { headers, cache: "no-store" });

  if (!response.ok) {
    return { ok: false, status: response.status, data: null };
  }

  const payload = (await response.json()) as unknown;

  return { ok: payload && typeof payload === "object" && !Array.isArray(payload), status: response.status, data: payload as Record<string, unknown> };
}

async function fetchJsonArray(url: string, headers: HeadersInit) {
  const response = await fetch(url, { headers, cache: "no-store" });

  if (!response.ok) {
    return { ok: false, status: response.status, items: [] as Array<Record<string, unknown>> };
  }

  const payload = (await response.json()) as unknown;

  return { ok: Array.isArray(payload), status: response.status, items: Array.isArray(payload) ? payload as Array<Record<string, unknown>> : [] };
}

async function lookupPublicRepository(repository: ParsedPublicRepository): Promise<RepositoryLookup | null> {
  let result: Awaited<ReturnType<typeof fetchJsonObject>>;

  if (repository.provider === "github") {
    result = await fetchJsonObject(`https://api.github.com/repos/${repository.owner}/${repository.name}`, headersFor("github"));
  } else if (repository.provider === "gitlab") {
    result = await fetchJsonObject(`https://gitlab.com/api/v4/projects/${getGitLabProjectPath(repository)}`, headersFor("gitlab"));
  } else if (repository.provider === "bitbucket") {
    result = await fetchJsonObject(`https://api.bitbucket.org/2.0/repositories/${repository.owner}/${repository.name}`, headersFor("bitbucket"));
  } else {
    if (await isBlockedRepositoryEndpoint(getGiteaApiBase(repository))) {
      return null;
    }

    result = await fetchJsonObject(`${getGiteaApiBase(repository)}/api/v1/repos/${repository.owner}/${repository.name}`, headersFor("gitea"));
  }

  if (!result.ok || !result.data) {
    return null;
  }

  const payload = result.data;
  const links = payload.links && typeof payload.links === "object" ? payload.links as Record<string, unknown> : null;
  const html = links?.html && typeof links.html === "object" ? links.html as Record<string, unknown> : null;
  const mainBranch = typeof payload.mainbranch === "string" ? payload.mainbranch : undefined;
  const defaultBranch = typeof payload.default_branch === "string" ? payload.default_branch : typeof payload.mainbranch === "string" ? payload.mainbranch : typeof payload.mainbranch === "object" && payload.mainbranch && typeof (payload.mainbranch as Record<string, unknown>).name === "string" ? String((payload.mainbranch as Record<string, unknown>).name) : mainBranch ?? "main";
  const isPrivate = payload.private === true || payload.is_private === true || payload.visibility === "private";
  const htmlUrl = typeof payload.html_url === "string" ? payload.html_url : typeof payload.web_url === "string" ? payload.web_url : typeof html?.href === "string" ? html.href : repository.url;
  const description = typeof payload.description === "string" ? payload.description : null;

  if (isPrivate) {
    return null;
  }

  return { ...repository, url: htmlUrl, defaultBranch, isPrivate, description };
}

export async function listPublicCommits(repository: RepositoryLookup) {
  if (repository.provider === "github") {
    const response = await fetchJsonArray(`https://api.github.com/repos/${repository.owner}/${repository.name}/commits?sha=${encodeURIComponent(repository.defaultBranch)}&per_page=18`, headersFor("github"));
    return response.ok ? response.items.flatMap(normalizeGitHubCommit) : [];
  }

  if (repository.provider === "gitlab") {
    const response = await fetchJsonArray(`https://gitlab.com/api/v4/projects/${getGitLabProjectPath(repository)}/repository/commits?ref_name=${encodeURIComponent(repository.defaultBranch)}&per_page=18`, headersFor("gitlab"));
    return response.ok ? response.items.flatMap(normalizeGitLabCommit) : [];
  }

  if (repository.provider === "bitbucket") {
    const response = await fetchJsonObject(`https://api.bitbucket.org/2.0/repositories/${repository.owner}/${repository.name}/commits/${encodeURIComponent(repository.defaultBranch)}?pagelen=18`, headersFor("bitbucket"));
    const values = response.ok && response.data && Array.isArray(response.data.values) ? response.data.values as Array<Record<string, unknown>> : [];
    return values.flatMap(normalizeBitbucketCommit);
  }

  if (await isBlockedRepositoryEndpoint(getGiteaApiBase(repository))) {
    return [];
  }

  const response = await fetchJsonArray(`${getGiteaApiBase(repository)}/api/v1/repos/${repository.owner}/${repository.name}/commits?sha=${encodeURIComponent(repository.defaultBranch)}&limit=18`, headersFor("gitea"));
  return response.ok ? response.items.flatMap(normalizeGitHubCommit) : [];
}

function normalizeGitHubCommit(entry: Record<string, unknown>): DemoCommit[] {
  const sha = typeof entry.sha === "string" ? entry.sha : null;
  const detail = entry.commit && typeof entry.commit === "object" ? entry.commit as Record<string, unknown> : null;
  const author = detail?.author && typeof detail.author === "object" ? detail.author as Record<string, unknown> : null;
  const message = typeof detail?.message === "string" ? detail.message : typeof entry.message === "string" ? entry.message : "";

  return sha && message ? [{ sha, message, authorName: typeof author?.name === "string" ? author.name : null, committedAt: typeof author?.date === "string" ? author.date : null, url: typeof entry.html_url === "string" ? entry.html_url : typeof entry.url === "string" ? entry.url : null }] : [];
}

function normalizeGitLabCommit(entry: Record<string, unknown>): DemoCommit[] {
  const sha = typeof entry.id === "string" ? entry.id : null;
  const message = typeof entry.message === "string" ? entry.message : "";

  return sha && message ? [{ sha, message, authorName: typeof entry.author_name === "string" ? entry.author_name : null, committedAt: typeof entry.committed_date === "string" ? entry.committed_date : null, url: typeof entry.web_url === "string" ? entry.web_url : null }] : [];
}

function normalizeBitbucketCommit(entry: Record<string, unknown>): DemoCommit[] {
  const sha = typeof entry.hash === "string" ? entry.hash : null;
  const message = typeof entry.message === "string" ? entry.message : "";
  const author = entry.author && typeof entry.author === "object" ? entry.author as Record<string, unknown> : null;
  const user = author?.user && typeof author.user === "object" ? author.user as Record<string, unknown> : null;
  const links = entry.links && typeof entry.links === "object" ? entry.links as Record<string, unknown> : null;
  const html = links?.html && typeof links.html === "object" ? links.html as Record<string, unknown> : null;

  return sha && message ? [{ sha, message, authorName: typeof user?.display_name === "string" ? user.display_name : typeof author?.raw === "string" ? author.raw : null, committedAt: typeof entry.date === "string" ? entry.date : null, url: typeof html?.href === "string" ? html.href : null }] : [];
}

function parseConventionalCommit(message: string) {
  const firstLine = message.split("\n")[0] ?? message;
  const match = firstLine.match(/^(\w+)(\([^)]*\))?(!)?:\s*(.*)$/s);

  if (!match) {
    return { group: "Changed", description: firstLine };
  }

  const prefix = match[1].toLowerCase();
  const hasBreaking = match[3] === "!" || /BREAKING[-\s]CHANGE/i.test(message);
  const description = match[4].trim() || firstLine;

  if (hasBreaking) {
    return { group: "Breaking Changes", description };
  }

  const groups: Record<string, string> = { feat: "Added", fix: "Fixed", perf: "Changed", refactor: "Changed", docs: "Documentation", test: "Internal", chore: "Internal", ci: "Internal", build: "Internal", revert: "Removed" };

  return { group: groups[prefix] ?? "Changed", description };
}

export function renderFallbackChangelog(commits: DemoCommit[]) {
  const order = ["Added", "Changed", "Fixed", "Removed", "Breaking Changes", "Documentation", "Internal"];
  const groups = new Map<string, string[]>();

  for (const commit of commits) {
    const { group, description } = parseConventionalCommit(commit.message);
    const line = description.length > 150 ? `${description.slice(0, 147)}...` : description;

    groups.set(group, [...(groups.get(group) ?? []), `- ${line}`]);
  }

  return order.flatMap((group) => {
    const bullets = groups.get(group);
    return bullets?.length ? [`## ${group}`, bullets.join("\n")] : [];
  }).join("\n\n") || "No user-facing changes.";
}

export function buildEnglishReasoningTrace(commits: DemoCommit[]) {
  const commitCount = commits.length;
  const examples = commits.slice(0, 6).map((commit) => `- ${commit.sha.slice(0, 7)}: ${commit.message.split("\n")[0]}`).join("\n");

  return [
    `Read ${commitCount} recent commit${commitCount === 1 ? "" : "s"} from the public repository.`,
    "Treated commit messages as untrusted input and ignored anything that looked like instructions instead of software changes.",
    "Filtered out dependency-only, chore-only, test-only, and low-signal internal commits unless they clearly described user-facing impact.",
    "Grouped related changes into release-note sections using the CommitGlow changelog rules.",
    examples ? `Representative commits reviewed:\n${examples}` : "No representative commits were available to summarize.",
  ].join("\n\n");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));

  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getDemoCacheKey({ repository, commits }: { repository: RepositoryLookup; commits: DemoCommit[] }) {
  const commitFingerprint = await sha256(JSON.stringify(commits.map((commit) => ({ sha: commit.sha, message: commit.message }))));
  const cacheKey = await sha256(JSON.stringify({ provider: repository.provider, owner: repository.owner.toLowerCase(), name: repository.name.toLowerCase(), branch: repository.defaultBranch, model: changelogModel, commitFingerprint }));

  return { cacheKey, commitFingerprint };
}

export async function readDemoCache(cacheKey: string) {
  try {
    const [cached] = await db.select({ body: demoGenerationCache.body, metadata: demoGenerationCache.metadata }).from(demoGenerationCache).where(eq(demoGenerationCache.cacheKey, cacheKey)).limit(1);
    const metadata = cached?.metadata && typeof cached.metadata === "object" ? cached.metadata as Record<string, unknown> : {};

    if (!cached || metadata.status === "generating") {
      return null;
    }

    return { body: cached.body, aiGenerated: metadata.aiGenerated === true, reasoningTrace: typeof metadata.reasoningTrace === "string" ? metadata.reasoningTrace : "" };
  } catch {
    return null;
  }
}

export async function reserveDemoCache({ repository, cacheKey, commitFingerprint, commits }: { repository: RepositoryLookup; cacheKey: string; commitFingerprint: string; commits: DemoCommit[] }) {
  try {
    const inserted = await db.insert(demoGenerationCache).values({
      cacheKey,
      provider: repository.provider,
      owner: repository.owner,
      name: repository.name,
      branch: repository.defaultBranch,
      commitFingerprint,
      commitCount: commits.length,
      model: changelogModel,
      body: "",
      metadata: { status: "generating", commits, commitShas: commits.map((commit) => commit.sha) },
    }).onConflictDoNothing({ target: demoGenerationCache.cacheKey }).returning({ cacheKey: demoGenerationCache.cacheKey });

    if (inserted.length > 0) {
      return "reserved" as const;
    }

    const [existing] = await db.select({ body: demoGenerationCache.body, metadata: demoGenerationCache.metadata, updatedAt: demoGenerationCache.updatedAt }).from(demoGenerationCache).where(eq(demoGenerationCache.cacheKey, cacheKey)).limit(1);
    const metadata = existing?.metadata && typeof existing.metadata === "object" ? existing.metadata as Record<string, unknown> : {};
    const ageMs = existing?.updatedAt instanceof Date ? Date.now() - existing.updatedAt.getTime() : 0;

    if (metadata.status === "generating" && ageMs > 45_000) {
      await db.update(demoGenerationCache).set({
        body: "",
        commitCount: commits.length,
        metadata: { status: "generating", commits, commitShas: commits.map((commit) => commit.sha), recoveredAt: new Date().toISOString() },
        updatedAt: new Date(),
      }).where(eq(demoGenerationCache.cacheKey, cacheKey));

      return "reserved" as const;
    }

    return "pending" as const;
  } catch {
    return "unavailable" as const;
  }
}

export async function writeDemoCache({ repository, cacheKey, commitFingerprint, commits, body, aiGenerated, reasoningTrace = "" }: { repository: RepositoryLookup; cacheKey: string; commitFingerprint: string; commits: DemoCommit[]; body: string; aiGenerated: boolean; reasoningTrace?: string }) {
  try {
    await db.insert(demoGenerationCache).values({
      cacheKey,
      provider: repository.provider,
      owner: repository.owner,
      name: repository.name,
      branch: repository.defaultBranch,
      commitFingerprint,
      commitCount: commits.length,
      model: changelogModel,
      body,
      metadata: { status: "complete", aiGenerated, reasoningTrace: reasoningTrace || buildEnglishReasoningTrace(commits), commits, commitShas: commits.map((commit) => commit.sha) },
    }).onConflictDoUpdate({
      target: demoGenerationCache.cacheKey,
      set: { body, commitCount: commits.length, metadata: { status: "complete", aiGenerated, reasoningTrace: reasoningTrace || buildEnglishReasoningTrace(commits), commits, commitShas: commits.map((commit) => commit.sha) }, updatedAt: new Date() },
    });
  } catch {}
}

async function generateDemoChangelog(repository: RepositoryLookup, commits: DemoCommit[]) {
  const { cacheKey, commitFingerprint } = await getDemoCacheKey({ repository, commits });
  const cached = await readDemoCache(cacheKey);

  if (cached) {
    return { ...cached, cached: true };
  }

  let generated: { body: string; aiGenerated: boolean };

  if (!aiConfigured()) {
    generated = { body: renderFallbackChangelog(commits), aiGenerated: false };
  } else {
    try {
      const { generateText } = await import("ai");
      const result = await generateText({ model: changelogModel, system: changelogSystemPrompt, prompt: changelogUserPrompt(commits) });
      generated = { body: result.text.trim(), aiGenerated: true };
    } catch {
      generated = { body: renderFallbackChangelog(commits), aiGenerated: false };
    }
  }

  await writeDemoCache({ repository, cacheKey, commitFingerprint, commits, ...generated });

  return { ...generated, cached: false };
}

export async function findPublicRepository(value: string) {
  const candidates = parsePublicRepositoryInput(value);

  for (const candidate of candidates) {
    const repository = await lookupPublicRepository(candidate);

    if (repository) {
      return repository;
    }
  }

  return null;
}

export async function loadPublicDemo(repoInput: string | undefined): Promise<PublicDemoResult> {
  if (!repoInput) {
    return { status: "idle" };
  }

  const repository = await findPublicRepository(repoInput);

  if (!repository) {
    return { status: "error", message: "Enter a public GitHub, GitLab, Bitbucket, or Gitea repository URL. Short owner/repo links try GitHub, GitLab, then Bitbucket." };
  }

  const commits = await listPublicCommits(repository);

  if (commits.length === 0) {
    return { status: "error", message: `No recent commits were available on ${repository.defaultBranch}.` };
  }

  const generated = await generateDemoChangelog(repository, commits);

  return {
    status: "success",
    provider: repository.provider,
    repo: `${repository.owner}/${repository.name}`,
    repoUrl: repository.url,
    description: repository.description,
    defaultBranch: repository.defaultBranch,
    commits,
    body: generated.body,
    aiGenerated: generated.aiGenerated,
    cached: generated.cached,
    reasoningTrace: "reasoningTrace" in generated ? generated.reasoningTrace : "",
  };
}

export async function resolvePublicDemo(repoInput: string) {
  const repository = await findPublicRepository(repoInput);

  if (!repository) {
    return {
      status: "error" as const,
      message: "Enter a public GitHub, GitLab, Bitbucket, or Gitea repository URL. Short owner/repo links try GitHub, GitLab, then Bitbucket.",
    };
  }

  const commits = await listPublicCommits(repository);

  if (commits.length === 0) {
    return { status: "error" as const, message: `No recent commits were available on ${repository.defaultBranch}.` };
  }

  return { status: "success" as const, repository, commits };
}
