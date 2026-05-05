import { seo } from "@/lib/seo";

export function SiteFooter() {
  const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO ?? process.env.GITHUB_REPOSITORY ?? "Ultro/commitglow";
  const githubHref = githubRepo.startsWith("https://github.com/") ? githubRepo : `https://github.com/${githubRepo}`;

  return (
    <footer className="mx-auto flex w-full max-w-7xl flex-col gap-6 border-t border-white/10 px-5 py-8 font-mono text-xs uppercase tracking-[0.16em] text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <a href="/" className="text-white">&gt;_ CommitGlow</a>
      <nav className="flex flex-wrap gap-x-8 gap-y-3">
        <a className="text-violet-200" href="/demo">Try Demo</a>
        <a href="/pricing">Pricing</a>
        <a href={`mailto:${seo.contactEmail}`}>Contact</a>
        <a href={githubHref} target="_blank" rel="noreferrer">GitHub</a>
        <a href="https://github.com/carbonelldev/commitglow/blob/main/LICENSE" target="_blank" rel="noreferrer">License</a>
      </nav>
    </footer>
  );
}
