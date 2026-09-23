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
          className="text-left"
        >
          Going · {going.length}
        </button>
      </h2>
      {open ? <GoingList going={going} empty={empty} /> : null}
    </section>
  );
}
