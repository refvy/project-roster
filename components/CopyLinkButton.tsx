"use client";

import { useState } from "react";
import { useTrack } from "@/components/AnalyticsScope";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const track = useTrack();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("invite_copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        data-testid="copy-link"
        onClick={copy}
        className="inline-flex min-h-14 items-center rounded-full bg-accent px-6 text-sm font-semibold text-on-accent hover:bg-accent-deep"
      >
        {copied ? "Copied" : "Copy invitation link"}
      </button>
      <p
        data-testid="share-url"
        className="max-w-full break-all text-sm text-ink-soft"
      >
        {url}
      </p>
    </div>
  );
}
