export type ChangelogSharePlatform = "twitter" | "threads" | "linkedin" | "facebook" | "bluesky" | "reddit" | "hackernews" | "whatsapp" | "telegram" | "email";

export type ChangelogShareInput = {
  title: string;
  version?: string | null;
  body: string;
  source?: string | null;
  url?: string | null;
};

const maxPostLengths: Partial<Record<ChangelogSharePlatform, number>> = {
  twitter: 260,
  threads: 460,
  bluesky: 280,
  linkedin: 900,
  facebook: 900,
  reddit: 900,
  whatsapp: 900,
  telegram: 900,
};

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getChangelogBullets(markdown: string, limit = 5) {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^([-*]|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^([-*]|\d+\.)\s+/, "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function buildMarkdownExport(input: ChangelogShareInput) {
  const heading = [`# ${input.title.trim() || "Changelog"}`];

  if (input.version?.trim()) {
    heading.push(`Version: ${input.version.trim()}`);
  }

  if (input.source?.trim()) {
    heading.push(`Source: ${input.source.trim()}`);
  }

  if (input.url?.trim()) {
    heading.push(`Link: ${input.url.trim()}`);
  }

  return `${heading.join("\n")}\n\n${input.body.trim()}\n`;
}

export function buildJsonExport(input: ChangelogShareInput) {
  return JSON.stringify({
    title: input.title.trim() || "Changelog",
    version: input.version?.trim() || null,
    source: input.source?.trim() || null,
    url: input.url?.trim() || null,
    bullets: getChangelogBullets(input.body, 20),
    markdown: input.body.trim(),
    text: markdownToPlainText(input.body),
  }, null, 2);
}

export function buildHtmlExport(input: ChangelogShareInput) {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const body = input.body
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return `<h2>${escape(line.slice(3))}</h2>`;
      if (/^[-*]\s+/.test(line)) return `<li>${escape(line.replace(/^[-*]\s+/, ""))}</li>`;
      if (!line.trim()) return "";
      return `<p>${escape(line)}</p>`;
    })
    .join("\n")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/<\/ul>\n<ul>/g, "\n");

  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escape(input.title.trim() || "Changelog")}</title>\n<style>body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;max-width:760px;margin:48px auto;padding:0 20px;background:#050507;color:#f4f4f5;line-height:1.7}h1,h2{letter-spacing:-.04em}h2{margin-top:32px;color:#c4b5fd}li{margin:8px 0}.meta{color:#a1a1aa;font-size:13px}</style>\n</head>\n<body>\n<h1>${escape(input.title.trim() || "Changelog")}</h1>\n<p class="meta">${escape([input.version, input.source].filter(Boolean).join(" · "))}</p>\n${body}\n</body>\n</html>\n`;
}

export function buildShareText(input: ChangelogShareInput, platform?: ChangelogSharePlatform) {
  const title = input.title.trim() || "Changelog";
  const prefix = input.version?.trim() ? `${title} ${input.version.trim()}` : title;
  const source = input.source?.trim() ? ` from ${input.source.trim()}` : "";
  const bullets = getChangelogBullets(input.body, platform === "twitter" || platform === "bluesky" ? 2 : 4);
  const lines = [`${prefix}${source}`];

  if (bullets.length > 0) {
    lines.push("", ...bullets.map((bullet) => `- ${bullet}`));
  } else {
    lines.push("", markdownToPlainText(input.body));
  }

  if (input.url?.trim()) {
    lines.push("", input.url.trim());
  }

  const text = lines.join("\n").trim();
  const maxLength = platform ? maxPostLengths[platform] : undefined;

  if (!maxLength || text.length <= maxLength) {
    return text;
  }

  const url = input.url?.trim();
  const suffix = url ? `\n\n${url}` : "";
  const available = Math.max(40, maxLength - suffix.length - 1);

  return `${text.slice(0, available).trimEnd()}…${suffix}`;
}

export function buildShareUrls(input: ChangelogShareInput) {
  const url = input.url?.trim() || "";
  const title = input.title.trim() || "Changelog";
  const text = buildShareText(input);
  const shortText = buildShareText(input, "twitter");
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}`,
    threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(buildShareText(input, "threads"))}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodeURIComponent(buildShareText(input, "bluesky"))}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    hackernews: `https://news.ycombinator.com/submitlink?u=${encodedUrl}&t=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(buildShareText(input, "whatsapp"))}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(buildShareText(input, "telegram"))}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(text)}`,
  } satisfies Record<ChangelogSharePlatform, string>;
}

export function slugifyExportName(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

  return slug || "changelog";
}
