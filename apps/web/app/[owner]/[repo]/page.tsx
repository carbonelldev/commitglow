import { notFound, redirect } from "next/navigation";
import { findPublicRepository } from "@/lib/public-demo";

type Props = {
  params: Promise<{ owner: string; repo: string }>;
};

function isValidGitHubPathSegment(value: string) {
  return /^[A-Za-z0-9_.-]+$/.test(value);
}

export default async function PublicRepoShortcutPage({ params }: Props) {
  const { owner, repo } = await params;

  if (!isValidGitHubPathSegment(owner) || !isValidGitHubPathSegment(repo)) {
    notFound();
  }

  const repository = await findPublicRepository(`${owner}/${repo}`);

  if (!repository) {
    notFound();
  }

  redirect(`/demo?repo=${encodeURIComponent(`${repository.provider}:${repository.owner}/${repository.name}`)}`);
}
