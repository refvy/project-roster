"use client";

import { useState } from "react";
import { CopyRosterButton } from "@/components/CopyRosterButton";
import { GoingList } from "@/components/GoingList";

export function ManagerGoing({
  going,
  empty,
  canRemove,
  matchdayId,
  rosterPaste,
  counts,
}: {
  going: {
    id: string;
    name: string;
    positionKey: string | null;
    addedByName?: string | null;
  }[];
  empty: string;
  canRemove: boolean;
  matchdayId: string;
  rosterPaste: string;
  counts: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section data-testid="manager-going">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight">
          <button
            type="button"
            data-testid="roster-toggle"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex min-h-12 items-center gap-2 text-left"
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
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          {going.length > 0 ? <CopyRosterButton text={rosterPaste} /> : null}
          {open ? (
            <p
              className="max-w-xl text-right text-sm text-ink-soft"
              data-testid="position-counts"
            >
              {counts}
            </p>
          ) : null}
        </div>
      </div>
      {open ? (
        <GoingList
          going={going}
          empty={empty}
          canRemove={canRemove}
          matchdayId={matchdayId}
        />
      ) : null}
    </section>
  );
}
