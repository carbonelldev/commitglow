const DEFAULT_PROD_URL = "https://commitglow.dev";

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return DEFAULT_PROD_URL;
}

export const seo = {
  siteName: "CommitGlow",
  siteUrl: getSiteUrl(),
  contactEmail: "hi@commitglow.dev",
  salesEmail: "sales@commitglow.dev",
  title: {
    default: "CommitGlow — AI Changelog & Release Notes Generator for Developers",
    template: "%s | CommitGlow",
  },
  description:
    "Turn commits and diffs into clean release notes, changelogs, and launch posts. Open-source, markdown-first, and built for developers who ship.",
  keywords: [
    "changelog generator",
    "release notes generator",
    "AI changelog",
    "developer changelog tool",
    "automated release notes",
    "commit to changelog",
    "generate changelog from commits",
    "open source changelog",
    "markdown release notes",
    "devtools",
  ],
  robots: {
    index: true,
    follow: true,
  },
} as const;
