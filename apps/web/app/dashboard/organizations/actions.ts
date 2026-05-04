"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeOrganizationCookie, getActiveOrganization, slugify, userCanAccessOrganization } from "@/lib/organizations";
import { formatWorkspaceLimit, getWorkspaceLimit, toPlanSlug } from "@/lib/plans";
import { organizationMembers, organizations } from "@commitglow/db/schema";
import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

export type OrganizationFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function createOrganization(_: OrganizationFormState, formData: FormData): Promise<OrganizationFormState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to create a workspace." };
  }

  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) {
    return { status: "error", message: "Workspace name must be at least 2 characters." };
  }

  if (name.length > 80) {
    return { status: "error", message: "Workspace name must be 80 characters or fewer." };
  }

  const context = await getActiveOrganization(session.user);
  const accountPlan = toPlanSlug(session.user.plan);
  const workspaceLimit = getWorkspaceLimit(accountPlan);
  const [ownedOrganizationCount] = await db
    .select({ value: count() })
    .from(organizations)
    .where(eq(organizations.ownerId, session.user.id));

  if (workspaceLimit !== null && (ownedOrganizationCount?.value ?? 0) >= workspaceLimit) {
    return { status: "error", message: `${accountPlan.toUpperCase()} accounts are limited to ${workspaceLimit} workspaces total. Upgrade will unlock more.` };
  }

  const organizationId = crypto.randomUUID();
  const baseSlug = slugify(name) || "workspace";
  const [organization] = await db
    .insert(organizations)
    .values({
      id: organizationId,
      name,
      slug: `${baseSlug}-${organizationId.slice(0, 8)}`,
      ownerId: session.user.id,
      isPersonal: false
    })
    .returning();

  await db.insert(organizationMembers).values({
    id: crypto.randomUUID(),
    organizationId,
    userId: session.user.id,
    role: "owner"
  });

  (await cookies()).set(activeOrganizationCookie, organization.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/dashboard"
  });

  revalidatePath("/dashboard");

  return { status: "success", message: `Created and switched to ${organization.name}.` };
}

export async function switchOrganization(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return;
  }

  const organizationId = String(formData.get("organizationId") ?? "");
  const canAccess = await userCanAccessOrganization(session.user.id, organizationId);

  if (!canAccess) {
    return;
  }

  (await cookies()).set(activeOrganizationCookie, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/dashboard"
  });

  revalidatePath("/dashboard");
}

export async function getOrganizationLimitState() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { count: 0, limit: formatWorkspaceLimit("free"), reached: false };
  }

  const context = await getActiveOrganization(session.user);
  const accountPlan = toPlanSlug(session.user.plan);
  const workspaceLimit = getWorkspaceLimit(accountPlan);

  return {
    count: context.organizations.length,
    limit: formatWorkspaceLimit(accountPlan),
    reached: workspaceLimit !== null && context.organizations.length >= workspaceLimit
  };
}
