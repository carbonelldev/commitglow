export function TerminalPreview() {
  return (
    <div className="relative rounded-md border border-violet-200/50 bg-black/50 p-5 shadow-[0_0_42px_rgba(139,92,246,0.08)]">
      <div className="absolute -right-3 -top-3 h-5 w-5 border-r border-t border-violet-300" />
      <div className="flex items-center gap-3 border-b border-white/10 pb-4 font-mono text-xs text-zinc-400">
        <span className="h-3 w-3 rounded-full bg-zinc-600" />
        <span className="h-3 w-3 rounded-full bg-zinc-600" />
        <span className="h-3 w-3 rounded-full bg-zinc-600" />
        <span className="ml-4">commitglow <span className="text-violet-300">--demo</span></span>
      </div>
      <div className="space-y-5 pt-5 font-mono text-sm text-zinc-300">
        <div className="space-y-1">
          <p>&gt; Analyzing commits...</p>
          <p>&gt; Found 23 commits</p>
          <p>&gt; Generating release notes...</p>
        </div>
        <div className="border-y border-white/10 py-5">
          <p className="text-2xl text-white">v1.4.0</p>
          <p className="mt-2 text-xs text-zinc-400">Released May 20, 2026</p>
        </div>
        <div className="space-y-4">
          <section>
            <h3 className="text-white">Highlights</h3>
            <p className="mt-2 text-zinc-400">- Add authentication with GitHub</p>
            <p className="text-zinc-400">- Improve dashboard performance</p>
          </section>
          <section>
            <h3 className="text-white">Fixes</h3>
            <p className="mt-2 text-zinc-400">- Fix crash on invalid token</p>
            <p className="text-zinc-400">- Resolve dropdown alignment issue</p>
          </section>
          <section>
            <h3 className="text-white">Chores</h3>
            <p className="mt-2 text-zinc-400">- Update dependencies</p>
          </section>
        </div>
        <div className="flex items-center justify-between pt-2 text-zinc-400">
          <span>Ready to copy.</span>
          <span aria-hidden="true">[]</span>
        </div>
      </div>
    </div>
  );
}
