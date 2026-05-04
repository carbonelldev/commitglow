"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@commitglow/ui";
import { useState } from "react";

export function BillingPortalButton({ configured }: { configured: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function openPortal() {
    if (!configured) {
      setError("Polar customer portal is not configured yet.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await authClient.customer.portal();

      if (result?.error) {
        setError(result.error.message ?? "Could not open billing portal.");
        setPending(false);
      }
    } catch {
      setError("Could not open billing portal. Check the Polar configuration.");
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <Button type="button" variant="secondary" className="w-full" disabled={pending} onClick={openPortal}>
        {pending ? "Opening billing..." : "Manage Billing"}
      </Button>
      {error ? <p className="mt-3 rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-xs text-violet-100">{error}</p> : null}
    </div>
  );
}
