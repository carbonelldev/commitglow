"use client";

import { authClient } from "@/lib/auth-client";
import type { PaidPlanSlug } from "@/lib/plans";
import { Button } from "@commitglow/ui";
import { useState } from "react";

type PolarCheckoutButtonProps = {
  slug: PaidPlanSlug;
  referenceId?: string;
  configured: boolean;
  highlighted: boolean;
  children: React.ReactNode;
};

export function PolarCheckoutButton({ slug, referenceId, configured, highlighted, children }: PolarCheckoutButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function startCheckout() {
    if (!configured) {
      setError("Polar checkout is not configured yet.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      const result = await authClient.checkout({ slug, referenceId });

      if (result?.error) {
        setError(result.error.message ?? "Could not start checkout.");
        setPending(false);
      }
    } catch {
      setError("Could not start checkout. Check the Polar configuration.");
      setPending(false);
    }
  }

  return (
    <div className="mt-8">
      <Button type="button" variant={highlighted ? "primary" : "secondary"} className="group w-full" disabled={pending} onClick={startCheckout}>
        <span>{pending ? "Opening checkout…" : children}</span>
        <svg aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 16 16">
          <path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      </Button>
      {error ? <p className="mt-3 rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-xs text-violet-100">{error}</p> : null}
    </div>
  );
}
