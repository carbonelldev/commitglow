import { AnchorButton } from "@commitglow/ui";

const fallbackRepo = "Ultro/commitglow";

type GitHubRepo = {
  html_url: string;
  stargazers_count: number;
};

function getGitHubRepo() {
  return process.env.NEXT_PUBLIC_GITHUB_REPO ?? process.env.GITHUB_REPOSITORY ?? fallbackRepo;
}

function formatStars(stars: number) {
  if (stars < 1000) {
    return String(stars);
  }

  return `${(stars / 1000).toFixed(stars < 10000 ? 1 : 0)}k`;
}

async function getGitHubStars() {
  const repo = getGitHubRepo();
  const normalizedRepo = repo.replace(/^https:\/\/github\.com\//, "").replace(/\/$/, "");

  try {
    const response = await fetch(`https://api.github.com/repos/${normalizedRepo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "CommitGlow",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return { href: `https://github.com/${normalizedRepo}`, stars: null };
    }

    const repoData = (await response.json()) as GitHubRepo;

    return { href: repoData.html_url, stars: repoData.stargazers_count };
  } catch {
    return { href: `https://github.com/${normalizedRepo}`, stars: null };
  }
}

function StarIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
      <path
        d="m8 1.75 1.9 3.85 4.25.62-3.08 3 .73 4.23L8 11.45l-3.8 2 .73-4.23-3.08-3 4.25-.62L8 1.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export async function SiteHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const github = await getGitHubStars();

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between border-b border-white/10 px-5 py-5 font-mono text-xs uppercase tracking-[0.16em] text-zinc-300 sm:px-8">
      <a href="/" className="text-white">&gt;_ CommitGlow</a>
      <nav className="hidden items-center gap-10 md:flex">
        <a className="text-violet-200" href="/#features">[ Features ]</a>
        <a href="/#how">How it Works</a>
        <a href="/pricing">Pricing</a>
      </nav>
      <div className="hidden items-center gap-3 sm:flex">
        <a
          className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-black/30 px-4 py-3 text-zinc-300 transition hover:border-violet-300/50 hover:text-white"
          href={github.href}
          target="_blank"
          rel="noreferrer"
        >
          <StarIcon />
          <span>{github.stars === null ? "GitHub" : formatStars(github.stars)}</span>
        </a>
        <AnchorButton href={isAuthenticated ? "/dashboard" : "/auth/sign-in"}>
          {isAuthenticated ? "Dashboard" : "Get Started"}
        </AnchorButton>
      </div>
    </header>
  );
}
