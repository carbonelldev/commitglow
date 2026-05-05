import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { auth } from "@/lib/auth";
import { AnchorButton } from "@commitglow/ui";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Sign In | CommitGlow",
  description: "Sign in to CommitGlow to generate release notes, changelogs, and launch posts from your commits.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between font-mono text-xs uppercase tracking-[0.18em]">
        <a href="/" className="text-white transition hover:text-violet-200">&gt;_ CommitGlow</a>
        <div className="flex items-center gap-5">
          <a href="/demo" className="text-violet-200 transition hover:text-white">Try Demo</a>
          <a href="/" className="text-zinc-500 transition hover:text-white">&lt;- Back</a>
        </div>
      </div>
      <div className="auth-panel-enter mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-6xl items-center justify-center py-10">
        {children}
      </div>
    </main>
  );
}

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <AuthShell>
      {session ? (
        <div className="w-full max-w-md rounded-md border border-violet-300/30 bg-black/50 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Already authenticated</p>
          <h1 className="mt-4 font-mono text-3xl text-white">You are already signed in.</h1>
          <p className="mt-4 font-mono text-sm leading-7 text-zinc-400">Continue as {session.user.email} or return home.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <AnchorButton href="/dashboard" variant="primary">Open Dashboard</AnchorButton>
            <AnchorButton href="/">Back Home</AnchorButton>
          </div>
        </div>
      ) : (
        <AuthForm mode="sign-in" />
      )}
    </AuthShell>
  );
}
