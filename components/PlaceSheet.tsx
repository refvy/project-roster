"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { parseMapUrl } from "@/lib/map-url";

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
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraftVenue(venue);
    setDraftMap(mapUrl);
    setError("");
  }, [open, venue, mapUrl]);

  function save() {
    const nextVenue = draftVenue.trim();
    const nextMap = draftMap.trim();
    if (!nextVenue) {
      setError("Add a venue.");
      return;
    }
    const parsed = parseMapUrl(nextMap);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onSave(nextVenue, parsed.url ?? "");
  }

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
        Map/website
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
          Optional. Plain https URL only.
        </span>
      </label>
      {error ? (
        <p className="mt-3 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
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
          onClick={save}
          className="inline-flex min-h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-deep"
        >
          Done
        </button>
      </div>
    </Sheet>
  );
}
