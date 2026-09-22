"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";

const inputClass =
  "min-h-14 rounded-2xl border border-ink/10 bg-surface px-4 text-lg text-ink outline-none ring-accent/30 placeholder:text-ink/30 focus:ring-4";

export function PlaceSheet({
  open,
  venue,
  mapUrl,
  onClose,
  onSave,
}: {
  open: boolean;
  venue: string;
  mapUrl: string;
  onClose: () => void;
  onSave: (venue: string, mapUrl: string) => void;
}) {
  const [draftVenue, setDraftVenue] = useState(venue);
  const [draftMap, setDraftMap] = useState(mapUrl);

  useEffect(() => {
    if (!open) return;
    setDraftVenue(venue);
    setDraftMap(mapUrl);
  }, [open, venue, mapUrl]);

  return (
    <Sheet open={open} onClose={onClose} title="Add place" testId="place-sheet">
      <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
        Venue
        <input
          data-testid="venue-input"
          value={draftVenue}
          maxLength={120}
          onChange={(event) => setDraftVenue(event.target.value)}
          placeholder="Lumphini pitch 2"
          className={inputClass}
        />
      </label>
      <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-ink-soft">
        Map/link
        <input
          data-testid="map-url-input"
          value={draftMap}
          maxLength={500}
          onChange={(event) => setDraftMap(event.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          className={inputClass}
        />
        <span className="font-normal text-ink/50">
          Plain URL only. Empty is TBD.
        </span>
      </label>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-testid="place-sheet-clear"
          onClick={() => onSave("", "")}
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
        >
          Clear
        </button>
        <button
          type="button"
          data-testid="place-sheet-done"
          onClick={() => onSave(draftVenue.trim(), draftMap.trim())}
          className="inline-flex min-h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-deep"
        >
          Done
        </button>
      </div>
    </Sheet>
  );
}
