"use client";

import { useEffect, useRef } from "react";
import { useTrack } from "@/components/AnalyticsScope";
import { Sheet } from "@/components/Sheet";

export function DuplicateNameSheet({
  name,
  onCancel,
  onChangeStatus,
}: {
  name: string | null;
  onCancel: () => void;
  onChangeStatus: () => void;
}) {
  const track = useTrack();
  const shownFor = useRef<string | null>(null);

  useEffect(() => {
    if (!name) {
      shownFor.current = null;
      return;
    }
    if (shownFor.current === name) return;
    shownFor.current = name;
    track("dupe_warn_shown");
  }, [name, track]);

  return (
    <Sheet
      open={Boolean(name)}
      onClose={onCancel}
      title={`“${name}” is already on the list — change status instead?`}
      testId="duplicate-name-sheet"
    >
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          data-testid="duplicate-change-status"
          onClick={onChangeStatus}
          className="inline-flex min-h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-deep"
        >
          Change status
        </button>
        <button
          type="button"
          data-testid="duplicate-cancel"
          onClick={onCancel}
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
        >
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
