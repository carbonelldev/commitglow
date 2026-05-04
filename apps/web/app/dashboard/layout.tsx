import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { formatWorkspaceLimit, getWorkspaceLimit, toPlanSlug } from "@/lib/plans";
import { organizations as organizationTable, projects, repositories } from "@commitglow/db/schema";
import { asc, count, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const organizationContext = await getActiveOrganization(session.user);
  const organization = organizationContext.active;
  const accountPlan = toPlanSlug(session.user.plan);
  const workspaceLimit = getWorkspaceLimit(accountPlan);
  const [ownedWorkspaceCount] = await db.select({ value: count() }).from(organizationTable).where(eq(organizationTable.ownerId, session.user.id));
  const userProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug
    })
    .from(projects)
    .where(eq(projects.organizationId, organization.id))
    .orderBy(desc(projects.createdAt))
    .limit(8);
  const sidebarRepositories = await db
    .select({
      id: repositories.id,
      projectId: repositories.projectId,
      owner: repositories.owner,
      name: repositories.name
    })
    .from(repositories)
    .innerJoin(projects, eq(repositories.projectId, projects.id))
    .where(eq(projects.organizationId, organization.id))
    .orderBy(asc(repositories.owner), asc(repositories.name))
    .limit(24);
  const sidebarProjects = userProjects.map((project) => ({
    ...project,
    repositories: sidebarRepositories
      .filter((repository) => repository.projectId === project.id)
      .map((repository) => ({ id: repository.id, owner: repository.owner, name: repository.name }))
  }));

  return (
    <main className="min-h-screen bg-black/10 lg:flex">
      <DashboardNav
        identity={{ name: session.user.name, email: session.user.email, plan: session.user.plan }}
        organization={{ id: organization.id, name: organization.name }}
        organizations={organizationContext.organizations.map((item) => ({ id: item.id, name: item.name, role: item.role }))}
        workspaceLimit={{
          count: ownedWorkspaceCount?.value ?? 0,
          label: formatWorkspaceLimit(accountPlan),
          reached: workspaceLimit !== null && (ownedWorkspaceCount?.value ?? 0) >= workspaceLimit
        }}
        projects={sidebarProjects}
      />
      <section className="min-w-0 flex-1 p-5 md:p-8 lg:p-10">{children}</section>
    </main>
  );
}
