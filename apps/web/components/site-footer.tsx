export function SiteFooter() {
  const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO ?? process.env.GITHUB_REPOSITORY ?? "Ultro/commitglow";
  const githubHref = githubRepo.startsWith("https://github.com/") ? githubRepo : `https://github.com/${githubRepo}`;

  return (
    <footer className="mx-auto flex w-full max-w-7xl flex-col gap-6 border-t border-white/10 px-5 py-8 font-mono text-xs uppercase tracking-[0.16em] text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <a href="/" className="text-white">&gt;_ CommitGlow</a>
      <nav className="flex gap-8">
        <a href="https://twitter.com" target="_blank" rel="noreferrer">Twitter</a>
        <a href={githubHref} target="_blank" rel="noreferrer">GitHub</a>
        <a href="#">Privacy</a>
      </nav>
    </footer>
  );
}
