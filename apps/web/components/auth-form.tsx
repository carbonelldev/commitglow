"use client";

import { Button, Input } from "@commitglow/ui";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useId, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";
type AuthMethod = "github" | "google" | "email";

const lastMethodKey = "commitglow:last-auth-method";

function Spinner() {
  return <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" aria-hidden="true" />;
}

function GithubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.51.47-3.16-.63-3.36-1.21-.11-.3-.6-1.21-1.03-1.46-.35-.19-.85-.66-.01-.67.79-.01 1.35.75 1.54 1.06.9 1.55 2.34 1.11 2.91.85.09-.67.35-1.11.64-1.37-2.22-.26-4.55-1.14-4.55-5.08 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.28 9.28 0 0 1 12 6.96c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.95-2.34 4.82-4.57 5.08.36.32.68.93.68 1.89 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.08 10.08 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M21.6 12.23c0-.74-.07-1.45-.19-2.12H12v4.01h5.38a4.6 4.6 0 0 1-1.99 3.02v2.61h3.23c1.89-1.79 2.98-4.42 2.98-7.52Z" />
      <path fill="currentColor" d="M12 22c2.7 0 4.96-.91 6.62-2.47l-3.23-2.61c-.9.62-2.04.98-3.39.98-2.6 0-4.8-1.83-5.59-4.27H3.07v2.69A9.98 9.98 0 0 0 12 22Z" opacity="0.8" />
      <path fill="currentColor" d="M6.41 13.63A6.18 6.18 0 0 1 6.08 12c0-.57.12-1.12.33-1.63V7.68H3.07A10.26 10.26 0 0 0 2 12c0 1.56.36 3.03 1.07 4.32l3.34-2.69Z" opacity="0.6" />
      <path fill="currentColor" d="M12 6.1c1.47 0 2.78.52 3.82 1.53l2.87-2.99C16.95 3.01 14.69 2 12 2a9.98 9.98 0 0 0-8.93 5.68l3.34 2.69C7.2 7.93 9.4 6.1 12 6.1Z" opacity="0.9" />
    </svg>
  );
}

function LastUsed({ method, current }: { method: AuthMethod | null; current: AuthMethod }) {
  if (method !== current) {
    return null;
  }

  return (
    <span className="last-used-tag pointer-events-none absolute -right-1 -top-2 flex items-center gap-1.5 rounded-full border border-violet-300/25 bg-black px-2.5 py-1 text-[9px] text-violet-100 shadow-[0_0_18px_rgba(139,92,246,0.25)]" aria-label="Last used sign-in method">
      <span className="last-used-line h-px w-4 bg-gradient-to-r from-transparent to-violet-200" aria-hidden="true" />
      Last used
    </span>
  );
}

function passwordChecks(password: string) {
  return [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Upper and lowercase", met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "Number or symbol", met: /[0-9\W_]/.test(password) }
  ];
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<AuthMethod | null>(null);
  const [pendingMethod, setPendingMethod] = useState<AuthMethod | null>(null);
  const [password, setPassword] = useState("");
  const isSignUp = mode === "sign-up";
  const isPending = Boolean(pendingMethod);
  const checks = passwordChecks(password);
  const passedChecks = checks.filter((check) => check.met).length;
  const strengthLabel = passedChecks === checks.length ? "Strong" : passedChecks >= 2 ? "Good" : "Weak";
  const passwordHelpId = `${formId}-password-help`;
  const feedbackId = `${formId}-feedback`;

  useEffect(() => {
    const method = window.localStorage.getItem(lastMethodKey);

    if (method === "github" || method === "google" || method === "email") {
      setLastMethod(method);
    }
  }, []);

  function rememberMethod(method: AuthMethod) {
    window.localStorage.setItem(lastMethodKey, method);
    setLastMethod(method);
  }

  function goToAuthMode(nextMode: AuthMode) {
    const href = nextMode === "sign-up" ? "/auth/sign-up" : "/auth/sign-in";
    const canTransition = "startViewTransition" in document && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (canTransition) {
      (document as Document & { startViewTransition: (callback: () => void) => void }).startViewTransition(() => router.push(href));
      return;
    }

    router.push(href);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(isSignUp ? "Creating your account..." : "Checking your credentials...");
    setPendingMethod("email");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "CommitGlow User");

    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setPendingMethod(null);
      setStatus(null);
      setError(result.error.message ?? "Authentication failed.");
      return;
    }

    rememberMethod("email");
    setStatus("Session ready. Opening dashboard...");
    router.push("/dashboard");
    router.refresh();
  }

  async function signInWithProvider(provider: "github" | "google") {
    setError(null);
    setStatus(`Connecting ${provider === "github" ? "GitHub" : "Google"}...`);
    setPendingMethod(provider);
    rememberMethod(provider);

    try {
      const result = await authClient.signIn.social({ provider, callbackURL: "/dashboard" });

      if (result.error) {
        setPendingMethod(null);
        setStatus(null);
        setError(result.error.message ?? `Could not start ${provider} sign in.`);
      }
    } catch {
      setPendingMethod(null);
      setStatus(null);
      setError(`Could not start ${provider} sign in. Check the OAuth environment variables.`);
    }
  }

  return (
    <div className="auth-card w-full max-w-md rounded-xl border border-white/10 bg-black/65 p-6 shadow-[0_0_60px_rgba(139,92,246,0.12)] backdrop-blur-xl sm:p-7">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// {isSignUp ? "Create account" : "Welcome back"}</p>
        <h1 className="mt-4 font-mono text-3xl leading-tight text-white">{isSignUp ? "Start shipping notes." : "Sign in to CommitGlow."}</h1>
        <p className="mt-4 font-mono text-sm leading-7 text-zinc-400">Your last auth method stays on this device only.</p>
      </div>
      <div className="grid gap-3" aria-busy={isPending}>
        <Button type="button" className="auth-provider relative min-h-14 justify-center border-white/20 bg-white/[0.03] hover:bg-white/[0.06]" disabled={isPending} onClick={() => signInWithProvider("github")} aria-label="Continue with GitHub">
          <span className="inline-flex items-center justify-center gap-3">
            {pendingMethod === "github" ? <Spinner /> : <GithubIcon />}
            <span>{pendingMethod === "github" ? "Connecting GitHub..." : "Continue with GitHub"}</span>
          </span>
          <LastUsed method={lastMethod} current="github" />
        </Button>
        <Button type="button" className="auth-provider relative min-h-14 justify-center border-white/20 bg-white/[0.03] hover:bg-white/[0.06]" disabled={isPending} onClick={() => signInWithProvider("google")} aria-label="Continue with Google">
          <span className="inline-flex items-center justify-center gap-3">
            {pendingMethod === "google" ? <Spinner /> : <GoogleIcon />}
            <span>{pendingMethod === "google" ? "Connecting Google..." : "Continue with Google"}</span>
          </span>
          <LastUsed method={lastMethod} current="google" />
        </Button>
      </div>
      <div className="my-6 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.16em] text-zinc-600">
        <span className="h-px flex-1 bg-white/10" />
        Email
        <LastUsed method={lastMethod} current="email" />
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <form onSubmit={onSubmit} className="space-y-4" aria-busy={pendingMethod === "email"}>
        {isSignUp ? (
          <label className="block" htmlFor={`${formId}-name`}>
            <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Name</span>
            <Input id={`${formId}-name`} name="name" autoComplete="name" placeholder="Ada Lovelace" required disabled={isPending} />
          </label>
        ) : null}
        <label className="block" htmlFor={`${formId}-email`}>
          <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Email</span>
          <Input id={`${formId}-email`} name="email" type="email" autoComplete="email" placeholder="you@company.dev" required disabled={isPending} />
        </label>
        <label className="block" htmlFor={`${formId}-password`}>
          <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Password</span>
          <Input
            id={`${formId}-password`}
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder="8+ characters"
            minLength={8}
            required
            disabled={isPending}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            aria-describedby={isSignUp ? passwordHelpId : undefined}
          />
        </label>
        {isSignUp ? (
          <div id={passwordHelpId} className="rounded-md border border-white/10 bg-white/[0.03] p-3 font-mono" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em]">
              <span className="text-zinc-500">Password security</span>
              <span className={passedChecks === checks.length ? "text-emerald-200" : passedChecks >= 2 ? "text-violet-200" : "text-zinc-500"}>{strengthLabel}</span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-zinc-400">
              {checks.map((check) => (
                <div key={check.label} className="flex items-center gap-2">
                  <span className={check.met ? "text-emerald-300" : "text-zinc-600"} aria-hidden="true">{check.met ? "+" : "-"}</span>
                  <span className={check.met ? "text-zinc-200" : undefined}>{check.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div id={feedbackId} aria-live="polite" className="min-h-6">
          {error ? <p role="alert" className="rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-sm text-violet-100">! {error}</p> : null}
          {!error && status ? <p role="status" className="font-mono text-sm text-zinc-400">{status}</p> : null}
        </div>
        <Button className="min-h-12 w-full" variant="primary" disabled={isPending} aria-describedby={feedbackId}>
          {pendingMethod === "email" ? <Spinner /> : null}
          {pendingMethod === "email" ? (isSignUp ? "Creating account..." : "Signing in...") : isSignUp ? "Create Account" : "Sign In"}
        </Button>
      </form>
      <p className="mt-6 font-mono text-sm text-zinc-500">
        {isSignUp ? "Already have an account? " : "Need an account? "}
        <button type="button" className="cursor-pointer rounded-sm text-violet-200 underline-offset-4 transition hover:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-violet-300/50 focus:ring-offset-2 focus:ring-offset-black" onClick={() => goToAuthMode(isSignUp ? "sign-in" : "sign-up")}>
          {isSignUp ? "Sign in" : "Sign up"}
        </button>
      </p>
      <p className="mt-5 border-t border-white/10 pt-5 font-mono text-xs leading-6 text-zinc-600">Secure auth via better-auth. No provider secrets are stored in the browser.</p>
    </div>
  );
}
