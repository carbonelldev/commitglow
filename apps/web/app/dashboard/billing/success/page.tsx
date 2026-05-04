import { auth } from "@/lib/auth";
import { findPolarProductId, getPlanSlugFromPolarProduct, getPolarClient, getPolarProductId, getPolarReferenceId, updateAccountPlanForReference } from "@/lib/polar-billing";
import { Card } from "@commitglow/ui";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function isPaidCheckout(payload: Record<string, unknown>) {
  const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
  const paymentStatus = typeof payload.paymentStatus === "string" ? payload.paymentStatus.toLowerCase() : typeof payload.payment_status === "string" ? payload.payment_status.toLowerCase() : "";

  return [status, paymentStatus].some((value) => ["paid", "succeeded", "success", "confirmed", "complete", "completed"].includes(value));
}

function BillingError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Billing</p>
        <h1 className="mt-4 font-mono text-3xl text-white">Checkout could not be verified</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">{message}</p>
      </Card>
    </div>
  );
}

export default async function BillingSuccessPage({ searchParams }: { searchParams: Promise<{ checkout_id?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/auth/sign-in");
  }

  const { checkout_id: checkoutId } = await searchParams;

  if (!checkoutId) {
    return <BillingError message="Polar did not return a checkout id. Your plan will still sync from the billing webhook if it is configured." />;
  }

  const polarClient = getPolarClient();

  if (!polarClient) {
    return <BillingError message="Polar checkout is not configured in this environment." />;
  }

  let checkout: Record<string, unknown>;

  try {
    checkout = (await (polarClient.checkouts as { get: (params: { id: string }) => Promise<unknown> }).get({ id: checkoutId })) as Record<string, unknown>;
  } catch {
    return <BillingError message="Polar checkout lookup failed. Your plan will still sync from the billing webhook if it is configured." />;
  }

  const referenceId = getPolarReferenceId(checkout);

  if (referenceId !== session.user.id) {
    return <BillingError message="This checkout does not belong to the signed-in account." />;
  }

  if (!isPaidCheckout(checkout)) {
    return <BillingError message="Polar has not marked this checkout as paid yet. Refresh your account page in a moment." />;
  }

  const productId = getPolarProductId(checkout) ?? findPolarProductId(checkout);
  const plan = productId ? getPlanSlugFromPolarProduct(productId) : undefined;

  if (!plan) {
    return <BillingError message="This checkout product is not registered in CommitGlow." />;
  }

  await updateAccountPlanForReference(session.user.id, plan);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
  revalidatePath("/pricing");

  redirect("/dashboard/account?billing=success");
}
