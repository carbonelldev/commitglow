"use client";

import { updateAccountProfile, updateWorkspaceSettings, type SettingsFormState } from "@/app/dashboard/settings/actions";
import { Button, Input } from "@commitglow/ui";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

const initialState: SettingsFormState = {
  status: "idle",
  message: ""
};

type AccountSettingsFormProps = {
  name: string;
  email: string;
};

type WorkspaceSettingsFormProps = {
  workspaceName: string;
  organizationId: string;
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Saving…" : "Save Settings"}
    </Button>
  );
}

export function AccountSettingsForm({ name, email }: AccountSettingsFormProps) {
  const [state, formAction] = useActionState(updateAccountProfile, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label htmlFor="account-name" className="block">
          <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Display name</span>
          <Input id="account-name" name="name" defaultValue={name} minLength={2} maxLength={80} autoComplete="name" required />
        </label>

        <label htmlFor="account-email" className="block">
          <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Email</span>
          <Input id="account-email" value={email} type="email" disabled readOnly />
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-zinc-500">Your email comes from your sign-in method. Update the display name used across CommitGlow.</p>
        <SaveButton />
      </div>

      <div aria-live="polite" className="min-h-6">
        {state.message ? (
          <p className={state.status === "error" ? "font-mono text-sm text-violet-200" : "font-mono text-sm text-zinc-400"}>
            {state.status === "error" ? "! " : "// "}
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function WorkspaceSettingsForm({ workspaceName, organizationId }: WorkspaceSettingsFormProps) {
  const [state, formAction] = useActionState(updateWorkspaceSettings, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="organizationId" value={organizationId} />
      <label htmlFor="workspace-name" className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Workspace name</span>
        <Input id="workspace-name" name="workspaceName" defaultValue={workspaceName} minLength={2} maxLength={80} required />
      </label>
      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-zinc-500">This changes the active workspace label shown in the switcher and sidebar.</p>
        <SaveButton />
      </div>
      <div aria-live="polite" className="min-h-6">
        {state.message ? (
          <p className={state.status === "error" ? "font-mono text-sm text-violet-200" : "font-mono text-sm text-zinc-400"}>
            {state.status === "error" ? "! " : "// "}
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
