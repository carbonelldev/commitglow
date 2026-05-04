"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveOrganization } from "@/lib/organizations";
import { integrations } from "@commitglow/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function disconnectProvider(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return;
  }

  const integrationId = String(formData.get("integrationId") ?? "");
  const { active: organization } = await getActiveOrganization(session.user);

  await db
    .delete(integrations)
    .where(and(eq(integrations.id, integrationId), eq(integrations.organizationId, organization.id)));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/providers");
}
