import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HttpStatusScreen } from "@/components/http-status-screen";
import { getHttpStatusPage, httpStatusPages } from "@/lib/http-status-pages";

type Props = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  return httpStatusPages.map((page) => ({ code: String(page.code) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const page = getHttpStatusPage(Number(code));

  if (!page) {
    return { title: "HTTP Error | CommitGlow" };
  }

  return {
    title: `${page.code} ${page.title} | CommitGlow`,
    description: page.message,
  };
}

export default async function ErrorCodePage({ params }: Props) {
  const { code } = await params;
  const page = getHttpStatusPage(Number(code));

  if (!page) {
    notFound();
  }

  return <HttpStatusScreen page={page} />;
}
