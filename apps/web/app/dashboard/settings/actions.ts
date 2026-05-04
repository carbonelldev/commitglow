"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization, userCanAccessOrganization } from "@/lib/organizations";
import { getProviderAccountLimit, toPlanSlug } from "@/lib/plans";
import { integrations, organizationMembers, organizations, user as users } from "@commitglow/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export type SettingsFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

function isExplicitProviderConnection(metadata: unknown) {
  return Boolean(metadata && typeof metadata === "object" && (metadata as Record<string, unknown>).source === "explicit-provider-connect");
}

export async function updateAccountProfile(_: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to update your account." };
  }

  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2 || name.length > 80) {
    return { status: "error", message: "Your name must be between 2 and 80 characters." };
  }

  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, session.user.id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");

  return { status: "success", message: "Account profile saved." };
}

export async function updateWorkspaceSettings(_: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { status: "error", message: "You must be signed in to update workspace settings." };
  }

  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  const organizationId = String(formData.get("organizationId") ?? "");

  if (workspaceName.length < 2 || workspaceName.length > 80) {
    return { status: "error", message: "Workspace name must be between 2 and 80 characters." };
  }

  const canAccess = await userCanAccessOrganization(session.user.id, organizationId);

  if (!canAccess) {
    return { status: "error", message: "You do not have access to this workspace." };
  }

  const [membership] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, session.user.id), eq(organizationMembers.organizationId, organizationId)))
    .limit(1);

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { status: "error", message: "Only workspace owners and admins can rename this workspace." };
  }

  await db.update(organizations).set({ name: workspaceName, updatedAt: new Date() }).where(eq(organizations.id, organizationId));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/workspace/settings");

  return { status: "success", message: "Workspace settings saved." };
}

export async function getSettingsSnapshot() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  const organizationContext = await getActiveOrganization(session.user);
  const providerAccounts = await db
    .select({ id: integrations.id, metadata: integrations.metadata })
    .from(integrations)
    .where(eq(integrations.organizationId, organizationContext.active.id));
  const planSlug = toPlanSlug(session.user.plan);

  return {
    user: session.user,
    organization: organizationContext.active,
    workspaceCount: organizationContext.organizations.length,
    providerAccountCount: providerAccounts.filter((provider) => isExplicitProviderConnection(provider.metadata)).length,
    providerAccountLimit: getProviderAccountLimit(planSlug)
  };
}
