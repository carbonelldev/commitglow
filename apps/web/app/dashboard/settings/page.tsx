import { auth } from "@/lib/auth";
import { Card } from "@commitglow/ui";
import { headers } from "next/headers";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Settings</p>
        <h1 className="mt-4 font-mono text-4xl text-white">Account settings</h1>
      </div>
      <Card className="mt-8">
        <dl className="grid gap-5 font-mono text-sm">
          <div>
            <dt className="text-zinc-500">Name</dt>
            <dd className="mt-1 text-white">{user?.name ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Email</dt>
            <dd className="mt-1 text-white">{user?.email ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Plan</dt>
            <dd className="mt-1 text-white">free</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
