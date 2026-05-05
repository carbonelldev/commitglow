"use client";

import { useState } from "react";
import { Button } from "@commitglow/ui";

export function ShareDemoLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button type="button" onClick={copyLink} className="w-full sm:w-auto">
      {copied ? "Copied Link" : "Copy Share Link"}
    </Button>
  );
}
