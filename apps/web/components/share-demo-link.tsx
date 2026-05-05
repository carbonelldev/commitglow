"use client";

import { useState } from "react";
import { Button } from "@commitglow/ui";

export function ShareDemoLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copyLink() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(href);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = href;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 2200);
    }
  }

  return (
    <Button type="button" onClick={copyLink} className="w-full sm:w-auto">
      {copyFailed ? "Copy Failed" : copied ? "Copied Link" : "Copy Share Link"}
    </Button>
  );
}
