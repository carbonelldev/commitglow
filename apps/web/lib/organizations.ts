import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@commitglow/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";

export const activeOrganizationCookie = "commitglow_active_org";

type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function getUserOrganizations(userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      plan: organizations.plan,
      isPersonal: organizations.isPersonal,
      role: organizationMembers.role,
      createdAt: organizations.createdAt
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizationMembers.createdAt));
}

export async function getOrCreateDefaultOrganization(user: SessionUser) {
  const memberships = await getUserOrganizations(user.id);

  if (memberships[0]) {
    return memberships[0];
  }

  const organizationId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const baseName = user.name ? `${user.name}'s workspace` : "Personal workspace";
  const baseSlug = slugify(user.name || user.email.split("@")[0] || "workspace") || "workspace";

  const [organization] = await db
    .insert(organizations)
    .values({
      id: organizationId,
      name: baseName,
      slug: `${baseSlug}-${organizationId.slice(0, 8)}`,
      ownerId: user.id,
      isPersonal: true
    })
    .returning();

  await db.insert(organizationMembers).values({
    id: membershipId,
    organizationId,
    userId: user.id,
    role: "owner"
  });

  return { ...organization, role: "owner" as const };
}

export async function getActiveOrganization(user: SessionUser) {
  await getOrCreateDefaultOrganization(user);

  const memberships = await getUserOrganizations(user.id);
  const requestedOrganizationId = (await cookies()).get(activeOrganizationCookie)?.value;
  const active = memberships.find((membership) => membership.id === requestedOrganizationId) ?? memberships[0];

  if (!active) {
    throw new Error("Unable to resolve active organization.");
  }

  return {
    active,
    organizations: memberships
  };
}

export async function userCanAccessOrganization(userId: string, organizationId: string) {
  const [membership] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId)))
    .limit(1);

  return Boolean(membership);
}
