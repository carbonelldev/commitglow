"use client";

import { Button, Input } from "@commitglow/ui";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createWorkspace, type WorkspaceFormState } from "@/app/dashboard/workspaces/actions";

const initialState: WorkspaceFormState = {
  status: "idle",
  message: ""
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" disabled={pending || disabled} className="w-full">
      {pending ? "Creating..." : "Create Workspace"}
    </Button>
  );
}

export function WorkspaceCreateForm({ disabled, onSuccess }: { disabled: boolean; onSuccess?: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, formAction] = useActionState(createWorkspace, initialState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
      onSuccess?.();
    }
  }, [onSuccess, router, state.status]);

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Workspace name</span>
        <Input name="name" placeholder="Acme Engineering" minLength={2} maxLength={80} required disabled={disabled} />
      </label>
      <SubmitButton disabled={disabled} />
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
