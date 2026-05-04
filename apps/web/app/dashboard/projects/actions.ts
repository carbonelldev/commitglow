"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { getProjectLimit, toPlanSlug } from "@/lib/plans";
import { projects } from "@commitglow/db/schema";
import { count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export type ProjectFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createProject(_: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to create a project." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (name.length < 2) {
    return { status: "error", message: "Project name must be at least 2 characters." };
  }

  if (name.length > 80) {
    return { status: "error", message: "Project name must be 80 characters or fewer." };
  }

  const id = crypto.randomUUID();
  const baseSlug = slugify(name) || "project";
  const { active: organization } = await getActiveOrganization(session.user);
  const accountPlan = toPlanSlug(session.user.plan);
  const projectLimit = getProjectLimit(accountPlan);

  if (projectLimit !== null) {
    const [projectCount] = await db.select({ value: count() }).from(projects).where(eq(projects.organizationId, organization.id));

    if ((projectCount?.value ?? 0) >= projectLimit) {
      return { status: "error", message: `${accountPlan.toUpperCase()} workspaces are limited to ${projectLimit} projects. Upgrade to create more.` };
    }
  }

  await db.insert(projects).values({
    id,
    userId: session.user.id,
    organizationId: organization.id,
    name,
    slug: `${baseSlug}-${id.slice(0, 8)}`,
    description: description || null
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");

  return { status: "success", message: `Created ${name}.` };
}
