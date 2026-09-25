"use client";

import { useState } from "react";
import { useTrack } from "@/components/AnalyticsScope";

export function CopyRosterButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const track = useTrack();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track("roster_copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        data-testid="copy-roster"
        data-paste={text}
        onClick={copy}
        className="text-[14px] font-medium leading-none"
        style={{ color: "#6B7280" }}
      >
        Copy roster
      </button>
      {copied ? (
        <span
          data-testid="roster-copied-toast"
          role="status"
          className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[12px] leading-none text-cream"
        >
          Roster copied
        </span>
      ) : null}
    </span>
  );
}
