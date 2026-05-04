"use client";

import { Button, Input } from "@commitglow/ui";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createProject, type ProjectFormState } from "@/app/dashboard/projects/actions";

const initialState: ProjectFormState = {
  status: "idle",
  message: ""
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" disabled={pending || disabled} className="w-full">
      {pending ? "Creating..." : "New Project"}
    </Button>
  );
}

export function ProjectCreateForm({ disabled = false }: { disabled?: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createProject, initialState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Project name</span>
        <Input name="name" placeholder="CommitGlow" minLength={2} maxLength={80} required disabled={disabled} />
      </label>
      <label className="block">
        <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-zinc-500">Description</span>
        <Input name="description" placeholder="Optional product or workspace note" maxLength={160} disabled={disabled} />
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
