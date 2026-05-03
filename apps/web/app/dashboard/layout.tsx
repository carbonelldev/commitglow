import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { db } from "@/lib/db";
import { getOrCreateDefaultOrganization } from "@/lib/organizations";
import { projects } from "@commitglow/db/schema";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const organization = await getOrCreateDefaultOrganization(session.user);
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

  return (
    <main className="min-h-screen bg-black/10 lg:flex">
      <DashboardNav user={{ name: session.user.name, email: session.user.email }} organization={{ name: organization.name, plan: organization.plan }} projects={userProjects} />
      <section className="min-w-0 flex-1 p-5 md:p-8 lg:p-10">{children}</section>
    </main>
  );
}
