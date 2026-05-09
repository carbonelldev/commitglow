"use client";

import { syncRepositoryCommits, type SyncCommitsFormState } from "@/app/dashboard/repositories/actions";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

const initialState: SyncCommitsFormState = {
  status: "idle",
  message: "",
  newCommits: 0
};

function SyncSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm border border-violet-300/30 bg-violet-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-violet-100 transition hover:border-violet-200/60 hover:bg-violet-500/20 disabled:opacity-50"
    >
      {pending ? "Syncing…" : "Sync Commits"}
    </button>
  );
}

export function SyncRepositoryButton({ repositoryId, onSynced }: { repositoryId: string; onSynced?: (state: SyncCommitsFormState) => void | Promise<void> }) {
  const { refresh } = useRouter();
  const onSyncedRef = useRef(onSynced);
  const [state, formAction] = useActionState<SyncCommitsFormState, FormData>(
    async () => syncRepositoryCommits(repositoryId),
    initialState
  );

  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    refresh();
    void onSyncedRef.current?.(state);
  }, [refresh, state]);

  return (
    <div>
      <form action={formAction}>
        <SyncSubmitButton />
      </form>
      {state.message ? (
        <p className={state.status === "error" ? "mt-2 font-mono text-[11px] text-violet-200" : "mt-2 font-mono text-[11px] text-zinc-400"}>
          {state.status === "error" ? "! " : "// "}
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
