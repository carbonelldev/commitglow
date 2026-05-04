"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@commitglow/ui";
import { useState } from "react";

export function ConnectGitHubButton({ callbackURL = "/dashboard/providers?connect=github" }: { callbackURL?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function connectGitHub() {
    setPending(true);
    setError("");

    try {
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL,
        scopes: ["repo", "read:user", "user:email"]
      });

      if (result?.error) {
        setError(result.error.message || "GitHub repository permission connection failed.");
        setPending(false);
      }
    } catch {
      setError("GitHub repository permission connection failed.");
      setPending(false);
    }
  }

  return (
    <div className="mt-5">
      <Button type="button" variant="primary" onClick={connectGitHub} disabled={pending} className="w-full">
        {pending ? "Connecting GitHub..." : "Connect GitHub Repositories"}
      </Button>
      {error ? <p className="mt-3 font-mono text-sm text-violet-200">! {error}</p> : null}
    </div>
  );
}
