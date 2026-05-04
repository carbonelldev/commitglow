import { disconnectProvider } from "@/app/dashboard/providers/actions";

export function DisconnectProviderButton({ integrationId }: { integrationId: string }) {
  return (
    <form action={disconnectProvider}>
      <input type="hidden" name="integrationId" value={integrationId} />
      <button type="submit" className="rounded-sm border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-violet-300/40 hover:text-white">
        Disconnect
      </button>
    </form>
  );
}
