"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { changelogs, projects } from "@commitglow/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export type ManualChangelogFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const sections = [
  { key: "added", label: "Added" },
  { key: "changed", label: "Changed" },
  { key: "fixed", label: "Fixed" },
  { key: "removed", label: "Removed" },
  { key: "breaking", label: "Breaking Changes" }
] as const;

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

    return [`## ${section.label}`, bullets.map((bullet) => `- ${bullet}`).join("\n")];
  });

  const notes = cleanText(formData.get("notes"), 1200);

  if (notes) {
    renderedSections.push("## Notes", notes);
  }

  return renderedSections.join("\n\n");
}

export async function createManualChangelog(_: ManualChangelogFormState, formData: FormData): Promise<ManualChangelogFormState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to create a changelog." };
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
    return { status: "error", message: "Add at least one concrete product or code change." };
  }

  if (body.length > 8000) {
    return { status: "error", message: "Manual changelog input is too large. Keep it under 8,000 characters." };
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.slug, projectSlug), eq(projects.organizationId, organization.id)))
    .limit(1);

  if (!project) {
    return { status: "error", message: "Project not found in the active workspace." };
  }

  await db.insert(changelogs).values({
    id: crypto.randomUUID(),
    projectId: project.id,
    title,
    version,
    body
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectSlug}`);
  revalidatePath(`/dashboard/projects/${projectSlug}/changelogs`);

  return { status: "success", message: "Manual changelog draft created." };
}
