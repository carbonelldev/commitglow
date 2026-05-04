"use server";

import { auth } from "@/lib/auth";
import {
  changelogModel,
  changelogSystemPrompt,
  aiConfigured,
  changelogUserPrompt,
} from "@/lib/ai";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import {
  changelogs,
  commits,
  projects,
  repositories,
} from "@commitglow/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export type ManualChangelogFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type GenerateChangelogPreviewState = {
  status: "idle" | "success" | "error";
  message: string;
  title: string;
  version: string;
  body: string;
  commitCount: number;
};

export type CommitSelectionEntry = {
  sha: string;
  message: string;
  authorName: string | null;
  committedAt: string | null;
  url: string | null;
  usedInChangelog: boolean;
};

const sections = [
  { key: "added", label: "Added" },
  { key: "changed", label: "Changed" },
  { key: "fixed", label: "Fixed" },
  { key: "removed", label: "Removed" },
  { key: "breaking", label: "Breaking Changes" },
] as const;

const conventionalPrefixes: Record<string, string> = {
  feat: "Added",
  fix: "Fixed",
  refactor: "Changed",
  perf: "Changed",
  docs: "Documentation",
  style: "Changed",
  test: "Internal",
  chore: "Internal",
  ci: "Internal",
  build: "Internal",
  revert: "Removed",
};

function parseConventionalCommit(message: string) {
  const match = message.match(/^(\w+)(\([^)]*\))?(!)?:\s*(.*)$/s);

  if (!match) {
    return { type: "Changed", description: message };
  }

  const prefix = match[1].toLowerCase();
  const hasBreaking = match[3] === "!";
  const description = match[4].trim();
  const hasBreakingBody = /BREAKING[-\s]CHANGE/i.test(message);

  if (hasBreaking || hasBreakingBody) {
    return { type: "Breaking Changes", description };
  }

  const section = conventionalPrefixes[prefix] ?? "Changed";

  return { type: section, description };
}

function renderChangelogBody(
  entries: Array<{ message: string; url?: string | null }>,
) {
  const groups = new Map<string, string[]>();
  const groupOrder = [
    "Added",
    "Changed",
    "Fixed",
    "Removed",
    "Breaking Changes",
    "Documentation",
    "Internal",
  ];

  for (const entry of entries) {
    const { type, description } = parseConventionalCommit(entry.message);
    const line =
      description.length > 160
        ? description.slice(0, 157) + "..."
        : description;
    const formatted = entry.url ? `- ${line} (${entry.url})` : `- ${line}`;

    if (!groups.has(type)) {
      groups.set(type, []);
    }

    groups.get(type)!.push(formatted);
  }

  const rendered = groupOrder.flatMap((group) => {
    const bullets = groups.get(group);

    if (!bullets || bullets.length === 0) {
      return [];
    }

    return [`## ${group}`, bullets.join("\n")];
  });

  if (rendered.length === 0) {
    return "No changes could be grouped from the synced commits.";
  }

  return rendered.join("\n\n");
}

function formatNow() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[\t ]+$/gm, "")
    .trim()
    .slice(0, maxLength);
}

function toBullets(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s+/, ""))
    .filter(Boolean);
}

function renderManualChangelog(formData: FormData) {
  const renderedSections = sections.flatMap((section) => {
    const bullets = toBullets(cleanText(formData.get(section.key), 1600));

    if (bullets.length === 0) {
      return [];
    }

    return [
      `## ${section.label}`,
      bullets.map((bullet) => `- ${bullet}`).join("\n"),
    ];
  });

  const notes = cleanText(formData.get("notes"), 1200);

  if (notes) {
    renderedSections.push("## Notes", notes);
  }

  return renderedSections.join("\n\n");
}

export async function createManualChangelog(
  _: ManualChangelogFormState,
  formData: FormData,
): Promise<ManualChangelogFormState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return {
      status: "error",
      message: "You must be signed in to create a changelog.",
    };
  }

  const projectId = String(formData.get("projectId") ?? "");
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const title = cleanText(formData.get("title"), 120);
  const version = cleanText(formData.get("version"), 48) || null;
  const body = renderManualChangelog(formData);

  if (!projectId || !projectSlug) {
    return { status: "error", message: "Project context is missing." };
  }

  if (title.length < 3) {
    return { status: "error", message: "Title must be at least 3 characters." };
  }

  if (body.length < 10) {
    return {
      status: "error",
      message: "Add at least one concrete product or code change.",
    };
  }

  if (body.length > 8000) {
    return {
      status: "error",
      message:
        "Manual changelog input is too large. Keep it under 8,000 characters.",
    };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.slug, projectSlug),
        eq(projects.organizationId, organization.id),
      ),
    )
    .limit(1);

  if (!project) {
    return {
      status: "error",
      message: "Project not found in the active workspace.",
    };
  }

  await db.insert(changelogs).values({
    id: crypto.randomUUID(),
    projectId: project.id,
    title,
    version,
    body,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectSlug}`);
  revalidatePath(`/dashboard/projects/${projectSlug}/changelogs`);

  return { status: "success", message: "Manual changelog draft created." };
}

function isCommitUsedInChangelog(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  const meta = metadata as Record<string, unknown>;

  return (
    Array.isArray(meta.usedInChangelogIds) && meta.usedInChangelogIds.length > 0
  );
}

export async function getRepositoryCommits(
  repositoryId: string,
): Promise<{
  status: "success" | "error";
  message: string;
  commits: CommitSelectionEntry[];
}> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in.", commits: [] };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [repository] = await db
    .select({ id: repositories.id, projectId: repositories.projectId })
    .from(repositories)
    .innerJoin(projects, eq(repositories.projectId, projects.id))
    .where(
      and(
        eq(repositories.id, repositoryId),
        eq(projects.organizationId, organization.id),
      ),
    )
    .limit(1);

  if (!repository) {
    return { status: "error", message: "Repository not found.", commits: [] };
  }

  const syncedCommits = await db
    .select({
      sha: commits.sha,
      message: commits.message,
      authorName: commits.authorName,
      committedAt: commits.committedAt,
      url: commits.url,
      metadata: commits.metadata,
    })
    .from(commits)
    .where(eq(commits.repositoryId, repository.id))
    .orderBy(desc(commits.committedAt))
    .limit(50);

  return {
    status: "success",
    message: "",
    commits: syncedCommits.map((commit) => ({
      sha: commit.sha,
      message: commit.message,
      authorName: commit.authorName,
      committedAt:
        commit.committedAt instanceof Date
          ? commit.committedAt.toISOString()
          : commit.committedAt,
      url: commit.url,
      usedInChangelog: isCommitUsedInChangelog(commit.metadata),
    })),
  };
}

export async function generateChangelogPreview(
  projectId: string,
  repositoryId: string,
  version?: string,
  selectedShas?: string[],
): Promise<GenerateChangelogPreviewState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return {
      status: "error",
      message: "You must be signed in.",
      title: "",
      version: "",
      body: "",
      commitCount: 0,
    };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [project] = await db
    .select({ id: projects.id, name: projects.name, slug: projects.slug })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organization.id),
      ),
    )
    .limit(1);

  if (!project) {
    return {
      status: "error",
      message: "Project not found.",
      title: "",
      version: "",
      body: "",
      commitCount: 0,
    };
  }

  const [repository] = await db
    .select({
      id: repositories.id,
      owner: repositories.owner,
      name: repositories.name,
      defaultBranch: repositories.defaultBranch,
    })
    .from(repositories)
    .where(
      and(
        eq(repositories.id, repositoryId),
        eq(repositories.projectId, project.id),
      ),
    )
    .limit(1);

  if (!repository) {
    return {
      status: "error",
      message: "Repository not attached to this project.",
      title: "",
      version: "",
      body: "",
      commitCount: 0,
    };
  }

  const query = db
    .select({ sha: commits.sha, message: commits.message, url: commits.url })
    .from(commits)
    .where(eq(commits.repositoryId, repository.id))
    .orderBy(desc(commits.committedAt));

  const recentCommits =
    selectedShas && selectedShas.length > 0
      ? (await query)
          .filter((commit) => selectedShas.includes(commit.sha))
          .slice(0, 50)
      : await query.limit(50);

  if (recentCommits.length === 0) {
    return {
      status: "error",
      message: selectedShas
        ? "No matching commits were found from your selection."
        : "No synced commits found for this repository. Sync commits first.",
      title: "",
      version: "",
      body: "",
      commitCount: 0,
    };
  }

  const resolvedVersion = version || `v0.1.0+${formatNow().replace(/-/g, "")}`;
  const title = `${repository.owner}/${repository.name} update ${formatNow()} -- ${project.name}`;
  let body = "";

  if (aiConfigured() && recentCommits.length > 0) {
    try {
      const { generateText } = await import("ai");

      const result = await generateText({
        model: changelogModel,
        system: changelogSystemPrompt,
        prompt: changelogUserPrompt(recentCommits),
      });

      body = result.text.trim();
    } catch {
      body = renderChangelogBody(recentCommits);
    }
  } else {
    body = renderChangelogBody(recentCommits);
  }

  return {
    status: "success",
    message: aiConfigured()
      ? `AI generated from ${recentCommits.length} commit${recentCommits.length === 1 ? "" : "s"}. ${selectedShas ? "Using your commit selection." : ""}`
      : `${recentCommits.length} commits grouped across ${body.split("## ").length - 1} sections. Connect AI Gateway for better results.`,
    title,
    version: resolvedVersion,
    body,
    commitCount: recentCommits.length,
  };
}

export async function saveGeneratedChangelog(
  _: ManualChangelogFormState,
  formData: FormData,
): Promise<ManualChangelogFormState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in." };
  }

  const projectId = String(formData.get("projectId") ?? "");
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const repositoryId = String(formData.get("repositoryId") ?? "") || null;
  const title = cleanText(formData.get("title"), 120);
  const version = cleanText(formData.get("version"), 48) || null;
  const body = cleanText(formData.get("body"), 8000);
  const selectedCommitsRaw = String(formData.get("selectedCommits") ?? "");

  if (!projectId || !projectSlug) {
    return { status: "error", message: "Project context is missing." };
  }

  if (title.length < 3) {
    return { status: "error", message: "Title must be at least 3 characters." };
  }

  if (body.length < 10) {
    return { status: "error", message: "Generated body is too short." };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.slug, projectSlug),
        eq(projects.organizationId, organization.id),
      ),
    )
    .limit(1);

  if (!project) {
    return {
      status: "error",
      message: "Project not found in the active workspace.",
    };
  }

  if (repositoryId) {
    const [repository] = await db
      .select({ id: repositories.id })
      .from(repositories)
      .where(
        and(
          eq(repositories.id, repositoryId),
          eq(repositories.projectId, project.id),
        ),
      )
      .limit(1);

    if (!repository) {
      return {
        status: "error",
        message: "Repository not attached to this project.",
      };
    }
  }

  const changelogId = crypto.randomUUID();
  const selectedShas = selectedCommitsRaw
    .split(",")
    .map((sha) => sha.trim())
    .filter((sha) => /^[a-fA-F0-9]{40}$/.test(sha));

  await db.insert(changelogs).values({
    id: changelogId,
    projectId: project.id,
    repositoryId,
    title,
    version,
    body,
  });

  for (const sha of selectedShas) {
    const [commit] = await db
      .select({ metadata: commits.metadata })
      .from(commits)
      .where(
        and(eq(commits.repositoryId, repositoryId ?? ""), eq(commits.sha, sha)),
      )
      .limit(1);

    if (!commit) {
      continue;
    }

    const existingIds = Array.isArray(
      (commit.metadata as Record<string, unknown> | null)?.usedInChangelogIds,
    )
      ? ((commit.metadata as Record<string, unknown>)
          .usedInChangelogIds as string[])
      : [];
    const existingMeta = (commit.metadata ?? {}) as Record<string, unknown>;

    await db
      .update(commits)
      .set({
        metadata: {
          ...existingMeta,
          usedInChangelogIds: [...new Set([...existingIds, changelogId])],
        },
      })
      .where(
        and(eq(commits.repositoryId, repositoryId ?? ""), eq(commits.sha, sha)),
      );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectSlug}`);
  revalidatePath(`/dashboard/projects/${projectSlug}/changelogs`);
  revalidatePath(
    `/dashboard/projects/${projectSlug}/repositories/${repositoryId}`,
  );

  return {
    status: "success",
    message: "Changelog draft created from commits.",
  };
}
