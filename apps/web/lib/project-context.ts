import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { projects } from "@commitglow/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function getProjectContext(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  const { active: organization } = await getActiveOrganization(session.user);
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      createdAt: projects.createdAt
    })
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.organizationId, organization.id)))
    .limit(1);

  if (!project) {
    return { session, organization, project: null };
  }

  return { session, organization, project };
}

export function formatProjectDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}
