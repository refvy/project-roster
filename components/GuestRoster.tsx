"use client";

import { useState } from "react";
import { GoingList } from "@/components/GoingList";

export function GuestRoster({
  going,
  empty,
}: {
  going: {
    id: string;
    name: string;
    positionKey: string | null;
    addedByName?: string | null;
  }[];
  empty: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section data-testid="guest-roster">
      <h2 className="font-display text-2xl tracking-tight">
        <button
          type="button"
          data-testid="roster-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-12 w-full items-center gap-2 text-left"
        >
          Going · {going.length}
          <svg
            aria-hidden
            data-testid="roster-chevron"
            data-open={open ? "true" : "false"}
            viewBox="0 0 20 20"
            className={`h-5 w-5 shrink-0 text-ink-soft transition ${
              open ? "" : "-rotate-90"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              d="M5 7.5 10 12.5 15 7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </h2>
      {open ? <GoingList going={going} empty={empty} /> : null}
    </section>
  );
}
