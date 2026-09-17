"use client";

import { useActionState, useState } from "react";
import { submitRsvp, type RsvpState } from "@/app/actions/rsvp";
import { AthleteNameInput } from "@/components/AthleteNameInput";
import { FatChoice } from "@/components/FatChoice";
import { groupedPositionRows, type Position } from "@/lib/positions";

type Props = {
  publicId: string;
  sport: string;
  positions: Position[];
  defaultName: string;
  defaultStatus: "GOING" | "OUT";
  defaultPosition: string | null;
  confirmed?: boolean;
};

export function GuestRsvpForm({
  publicId,
  sport,
  positions,
  defaultName,
  defaultStatus,
  defaultPosition,
  confirmed,
}: Props) {
  const [status, setStatus] = useState<"GOING" | "OUT">(defaultStatus);
  const [position, setPosition] = useState(defaultPosition ?? "");
  const [state, action, pending] = useActionState<RsvpState, FormData>(
    submitRsvp,
    confirmed ? { ok: true } : null,
  );

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="publicId" value={publicId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="position" value={position} />

      <h2 className="font-display text-2xl tracking-tight">I’m going</h2>

      <AthleteNameInput
        sport={sport}
        label="Your name"
        defaultValue={defaultName}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink-soft">In or out</legend>
        <div className="flex flex-wrap gap-3">
          <FatChoice
            selected={status === "GOING"}
            onClick={() => setStatus("GOING")}
            testId="status-going"
          >
            Going
          </FatChoice>
          <FatChoice
            selected={status === "OUT"}
            onClick={() => setStatus("OUT")}
            testId="status-out"
          >
            Out
          </FatChoice>
        </div>
      </fieldset>

      {status === "GOING" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium text-ink-soft">
            Position
          </legend>
          <PositionChipGrid
            positions={positions}
            selected={position}
            onSelect={setPosition}
            testIdPrefix="position"
          />
        </fieldset>
      ) : null}

      {state?.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p
          data-testid="rsvp-confirmed"
          className="rounded-2xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent-deep"
        >
          {status === "GOING"
            ? `You're going${position ? ` · ${position}` : ""}.`
            : "You're out."}
        </p>
      ) : null}

      <button
        type="submit"
        data-testid="rsvp-submit"
        disabled={pending}
        className="min-h-16 rounded-full bg-accent px-8 text-lg font-semibold text-on-accent transition hover:bg-accent-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : status === "GOING" ? "I’m going" : "I’m out"}
      </button>
    </form>
  );
}

export function PositionChipGrid({
  positions,
  selected,
  onSelect,
  testIdPrefix,
}: {
  positions: Position[];
  selected: string;
  onSelect: (key: string) => void;
  testIdPrefix: string;
}) {
  const rows = groupedPositionRows(positions);
  return (
    <div className="flex flex-col gap-3" data-testid="position-chips">
      {rows.map((row) => {
        const keys = row.map((item) => item.key).join(",");
        const gap =
          keys === "PF,SF"
            ? "gap-8 sm:gap-12"
            : keys === "ANY,GK"
              ? "gap-3"
              : "gap-3";
        return (
          <div
            key={keys}
            data-testid={`position-row-${row[0]?.key ?? keys}`}
            className={`flex flex-wrap justify-center ${gap}`}
          >
            {row.map((item) => (
              <FatChoice
                key={item.key}
                selected={selected === item.key}
                onClick={() => onSelect(item.key)}
                testId={`${testIdPrefix}-${item.key}`}
              >
                {item.label}
              </FatChoice>
            ))}
          </div>
        );
      })}
    </div>
  );
}
