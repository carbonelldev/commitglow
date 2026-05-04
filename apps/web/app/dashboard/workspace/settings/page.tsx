import { getSettingsSnapshot } from "@/app/dashboard/settings/actions";
import { WorkspaceSettingsForm } from "@/components/account-settings-form";
import { formatProviderAccountLimit, formatWorkspaceLimit, toPlanSlug } from "@/lib/plans";
import { Card } from "@commitglow/ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkspaceSettingsPage() {
  const snapshot = await getSettingsSnapshot();

  if (!snapshot) {
    redirect("/auth/sign-in");
  }

  const accountPlan = toPlanSlug(snapshot.user.plan);
  const workspaceLimitLabel = formatWorkspaceLimit(accountPlan);
  const providerLimitLabel = formatProviderAccountLimit(accountPlan);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b border-white/10 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Workspace Settings</p>
        <h1 className="mt-4 font-mono text-3xl text-white sm:text-4xl">{snapshot.organization.name}</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">Workspace-scoped settings for projects, repositories, provider connections, and future shared usage.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <Card className="p-0 hover:border-white/10">
          <div className="border-b border-white/10 p-6">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">Active workspace</p>
            <h2 className="mt-2 font-mono text-2xl text-white">Workspace profile</h2>
          </div>
          <div className="p-6">
            <WorkspaceSettingsForm workspaceName={snapshot.organization.name} organizationId={snapshot.organization.id} />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Capacity</p>
            <h2 className="mt-4 font-mono text-lg text-white">Workspace limits</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 font-mono">
              <div className="rounded-sm border border-white/10 p-3">
                <p className="text-3xl text-white">{snapshot.workspaceCount}/{workspaceLimitLabel}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-600">workspaces</p>
              </div>
              <div className="rounded-sm border border-white/10 p-3">
                <p className="text-3xl text-white">{snapshot.providerAccountCount}/{providerLimitLabel}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-600">providers</p>
              </div>
            </div>
            <p className="mt-5 font-mono text-sm leading-7 text-zinc-500">Provider connections are scoped to the active workspace, not globally to the user account.</p>
          </Card>

          <Card>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// Creation</p>
            <h2 className="mt-4 font-mono text-lg text-white">Create from switcher</h2>
            <p className="mt-3 font-mono text-sm leading-7 text-zinc-500">New workspaces are created from the workspace switcher modal in the sidebar. If your plan limit is reached, the create button is disabled before the modal opens and the server still validates the limit.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
