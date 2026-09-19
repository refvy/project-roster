"use client";

import { useState } from "react";
import { bumpSharePulse } from "@/app/actions/matchday";

export function ShareUpdateButton({ matchdayId }: { matchdayId: string }) {
  const [copied, setCopied] = useState(false);
  const [payload, setPayload] = useState<{ url: string; text: string } | null>(
    null,
  );

  async function copy() {
    const result = await bumpSharePulse(matchdayId);
    if (!result.ok) return;
    const text = result.text;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Payload still lands in the DOM for paste.
    }
    setPayload({ url: result.url, text });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        data-testid="share-update"
        onClick={copy}
        className="inline-flex min-h-14 items-center rounded-full border-2 border-accent px-6 text-sm font-semibold text-accent-deep hover:bg-accent-soft"
      >
        {copied ? "Copied" : "Share update"}
      </button>
      {payload ? (
        <>
          <p
            data-testid="share-update-url"
            className="max-w-full break-all text-sm text-ink-soft"
          >
            {payload.url}
          </p>
          <p data-testid="share-update-text" className="hidden">
            {payload.text}
          </p>
        </>
      ) : null}
    </div>
  );
}
