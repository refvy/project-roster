"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        data-testid="share-url"
        readOnly
        value={url}
        aria-label="Share link"
        className="min-h-14 flex-1 rounded-2xl border border-ink/10 bg-white px-4 font-mono text-sm text-ink"
      />
      <button
        type="button"
        data-testid="copy-link"
        onClick={copy}
        className="min-h-14 shrink-0 rounded-full bg-cobalt px-6 text-sm font-semibold text-cream hover:bg-cobalt-deep"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
