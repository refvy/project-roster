"use client";

import { useEffect, useState } from "react";
import { cancelMatchday } from "@/app/actions/matchday";

export function CancelMatchdayButton({ matchdayId }: { matchdayId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        data-testid="cancel-matchday"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
      >
        Cancel match
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-match-title"
            data-testid="cancel-match-sheet"
            className="relative z-10 w-full max-w-lg rounded-t-3xl bg-surface px-5 py-5 shadow-banner sm:rounded-3xl"
          >
            <h3
              id="cancel-match-title"
              className="font-display text-2xl tracking-tight"
            >
              Cancel this match?
            </h3>
            <p className="mt-2 text-ink-soft">
              Guests will see it was cancelled. The roster stays.
            </p>
            <form action={cancelMatchday} className="mt-6 flex flex-wrap gap-4">
              <input type="hidden" name="id" value={matchdayId} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
              >
                Keep match
              </button>
              <button
                type="submit"
                data-testid="cancel-matchday-confirm"
                className="inline-flex min-h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-deep"
              >
                Cancel match
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
