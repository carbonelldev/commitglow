import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@commitglow/db/schema";
import { asc, eq } from "drizzle-orm";

type SessionUser = {
  id: string;
  name: string;
  email: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function getOrCreateDefaultOrganization(user: SessionUser) {
  const [membership] = await db
    .select({
      organization: organizations
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, user.id))
    .orderBy(asc(organizationMembers.createdAt))
    .limit(1);

  if (membership) {
    return membership.organization;
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

  return organization;
}
