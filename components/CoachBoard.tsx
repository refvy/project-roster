"use client";

import { useMemo, useState, useTransition } from "react";
import { saveMatchdayFormation } from "@/app/actions/matchday";
import {
  BASKETBALL_LINES,
  describePitchNeed,
  fillPitch,
  getFormation,
  parseFormation,
  type FormationId,
  type GoingPlayer,
  type PitchLine,
  FOOTBALL_FORMATIONS,
} from "@/lib/pitch";
import { parseSport } from "@/lib/positions";

export function CoachBoard({
  matchdayId,
  sport,
  formation: savedFormation,
  going,
}: {
  matchdayId: string;
  sport: string;
  formation: string;
  going: GoingPlayer[];
}) {
  const isBasketball = parseSport(sport) === "basketball";
  const [formationId, setFormationId] = useState<FormationId>(
    parseFormation(savedFormation),
  );
  const [, startTransition] = useTransition();
  const template = isBasketball
    ? BASKETBALL_LINES
    : getFormation(formationId).lines;
  const { lines, bench } = useMemo(
    () => fillPitch(template, going),
    [template, going],
  );
  const need = describePitchNeed(lines, going.length);

  return (
    <section data-testid="coach-board" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight">Pitch</h2>
        {!isBasketball ? (
          <div className="flex flex-wrap gap-2">
            {FOOTBALL_FORMATIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`formation-${item.id}`}
                aria-pressed={formationId === item.id}
                onClick={() => {
                  setFormationId(item.id);
                  startTransition(() => {
                    void saveMatchdayFormation(matchdayId, item.id);
                  });
                }}
                className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-semibold tracking-wide transition ${
                  formationId === item.id
                    ? "border-accent bg-accent text-on-accent"
                    : "border-ink/15 bg-surface text-ink hover:border-accent/40"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {need ? (
        <p
          data-testid="coach-banner"
          className="rounded-2xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent-deep"
        >
          {need}
        </p>
      ) : null}

      <div
        className={`relative overflow-hidden rounded-3xl bg-cream-deep ring-1 ring-accent/20 ${
          isBasketball ? "min-h-[22rem]" : "min-h-[28rem]"
        }`}
      >
        {isBasketball ? <HalfCourtMarks /> : <PitchMarks />}
        <div
          className={`relative z-10 flex h-full flex-col-reverse justify-between gap-3 px-3 py-5 sm:px-5 sm:py-6 ${
            isBasketball ? "min-h-[22rem]" : "min-h-[28rem]"
          }`}
        >
          {lines.map((line, lineIndex) => (
            <div
              key={`${line.area}-${lineIndex}`}
              className="flex items-center justify-evenly gap-2"
            >
              {line.slots.map((slot, slotIndex) => (
                <PitchSlotView
                  key={`${slot.key}-${slotIndex}`}
                  slot={slot}
                  index={slotIndex}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {bench.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-ink-soft">Bench</h3>
          <ul data-testid="bench" className="mt-2 divide-y divide-ink/10">
            {bench.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="font-medium">{player.name}</span>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold tracking-wide text-accent-deep">
                  {!player.positionKey || player.positionKey === "ANY"
                    ? "Any"
                    : player.positionKey}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function PitchSlotView({
  slot,
  index,
}: {
  slot: PitchLine["slots"][number];
  index: number;
}) {
  if (slot.player) {
    return (
      <div
        data-testid={`slot-filled-${slot.key}`}
        className="flex min-h-16 min-w-[4.5rem] flex-col items-center justify-center rounded-full bg-accent px-3 py-2 text-center text-on-accent"
      >
        <span className="max-w-[7rem] truncate text-sm font-semibold">
          {slot.player.name}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide opacity-70">
          {slot.key}
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid={`slot-empty-${slot.key}-${index}`}
      className="flex min-h-16 min-w-[4.5rem] flex-col items-center justify-center rounded-full border border-dashed border-ink/15 bg-surface/70 px-3 py-2 text-center"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-ink/35">
        {slot.key}
      </span>
    </div>
  );
}

function PitchMarks() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
    >
      <rect
        x="4"
        y="4"
        width="92"
        height="132"
        rx="4"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.22"
        strokeWidth="0.8"
      />
      <line
        x1="4"
        y1="70"
        x2="96"
        y2="70"
        stroke="var(--accent)"
        strokeOpacity="0.22"
        strokeWidth="0.6"
      />
      <circle
        cx="50"
        cy="70"
        r="12"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.22"
        strokeWidth="0.6"
      />
      <rect
        x="28"
        y="4"
        width="44"
        height="18"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.18"
        strokeWidth="0.6"
      />
      <rect
        x="28"
        y="118"
        width="44"
        height="18"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.18"
        strokeWidth="0.6"
      />
    </svg>
  );
}

function HalfCourtMarks() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 80"
      preserveAspectRatio="none"
    >
      <rect
        x="4"
        y="4"
        width="92"
        height="72"
        rx="4"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.22"
        strokeWidth="0.8"
      />
      <path
        d="M 28 4 A 22 22 0 0 1 72 4"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.22"
        strokeWidth="0.6"
      />
      <circle
        cx="50"
        cy="76"
        r="10"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.22"
        strokeWidth="0.6"
      />
    </svg>
  );
}
