"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="w-full whitespace-nowrap rounded-sm border border-white/10 px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:border-violet-300/50 hover:bg-white/[0.02] hover:text-white disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
