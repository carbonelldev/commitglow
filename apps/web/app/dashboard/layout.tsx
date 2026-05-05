import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { getPlanUsageSnapshot } from "@/lib/plan-usage";
import { projects, repositories } from "@commitglow/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const organizationContext = await getActiveOrganization(session.user);
  const organization = organizationContext.active;
  const usage = await getPlanUsageSnapshot(session.user, organization);
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
          count: usage.workspaces.used,
          label: usage.workspaces.limit === null ? "Unlimited" : String(usage.workspaces.limit),
          reached: usage.workspaces.reached
        }}
        usageSummary={{
          generations: usage.generations.remainingLabel,
          generationsUsed: usage.generations.label,
          projects: usage.projects.remainingLabel,
          providers: usage.providerAccounts.remainingLabel
        }}
        projects={sidebarProjects}
      />
      <section className="min-w-0 flex-1 p-5 md:p-8 lg:p-10">{children}</section>
    </main>
  );
}
