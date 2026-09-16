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
  const { lines, bench, any } = useMemo(
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

      {isBasketball ? (
        <HalfCourtBoard lines={lines} />
      ) : (
        <HalfPitchBoard lines={lines} />
      )}

      <AnyStrip any={any} overflow={bench.filter((p) => p.positionKey !== "ANY")} />
    </section>
  );
}

function HalfPitchBoard({ lines }: { lines: PitchLine[] }) {
  return (
    <div
      data-testid="half-pitch"
      className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-surface ring-1 ring-ink/15"
      style={{ aspectRatio: "68 / 52.5" }}
    >
      <HalfPitchMarks />
      <div className="absolute inset-0 z-10 flex flex-col-reverse justify-between px-4 py-3 sm:px-6 sm:py-4">
        {lines.map((line, lineIndex) => (
          <div
            key={`${line.area}-${lineIndex}`}
            className="flex items-center justify-evenly gap-1"
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
  );
}

function HalfCourtBoard({ lines }: { lines: PitchLine[] }) {
  return (
    <div
      data-testid="half-court"
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl bg-surface ring-1 ring-ink/20"
      style={{ aspectRatio: "15 / 14" }}
    >
      <HalfCourtMarks />
      <div className="absolute inset-0 z-10 flex flex-col-reverse justify-between px-6 py-5 sm:px-8 sm:py-6">
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
  );
}

function AnyStrip({
  any,
  overflow,
}: {
  any: GoingPlayer[];
  overflow: GoingPlayer[];
}) {
  const people = [...any, ...overflow];
  if (people.length === 0) return null;
  return (
    <div
      data-testid="bench"
      className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-ink/10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        Any
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {people.map((player) => (
          <li
            key={player.id}
            className="inline-flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 text-sm"
          >
            <span className="font-medium">{player.name}</span>
            <span className="text-xs font-semibold tracking-wide text-ink-soft">
              {!player.positionKey || player.positionKey === "ANY"
                ? "Any"
                : player.positionKey}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
        className="flex min-h-12 min-w-[3.75rem] flex-col items-center justify-center rounded-full bg-accent px-2.5 py-1.5 text-center text-on-accent sm:min-h-14 sm:min-w-[4.25rem] sm:px-3"
      >
        <span className="max-w-[6.5rem] truncate text-sm font-semibold">
          {slot.player.name}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
          {slot.key}
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid={`slot-empty-${slot.key}-${index}`}
      className="flex min-h-12 min-w-[3.75rem] flex-col items-center justify-center rounded-full border border-dashed border-ink/15 bg-surface/80 px-2.5 py-1.5 text-center sm:min-h-14 sm:min-w-[4.25rem]"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink/35">
        {slot.key}
      </span>
    </div>
  );
}

function HalfPitchMarks() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 680 525"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="680" height="525" fill="#fffdf9" />
      <g
        fill="none"
        stroke="#1a1714"
        strokeOpacity="0.55"
        strokeWidth="1.6"
      >
        <rect x="12" y="12" width="656" height="501" />
        <rect x="248" y="458" width="184" height="55" />
        <rect x="138" y="348" width="404" height="165" />
        <path d="M 303 513 H 377 V 525 H 303 Z" />
        <circle cx="340" cy="403" r="2.2" fill="#1a1714" stroke="none" />
        <path d="M 267 348 A 91.5 91.5 0 0 0 413 348" />
        <path d="M 248.5 12 A 91.5 91.5 0 0 1 431.5 12" />
        <circle cx="340" cy="12" r="2.2" fill="#1a1714" stroke="none" />
      </g>
    </svg>
  );
}

function HalfCourtMarks() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 500 470"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="500" height="470" fill="#fffdf9" />
      <g
        fill="none"
        stroke="#1a1714"
        strokeOpacity="0.62"
        strokeWidth="1.5"
      >
        <rect x="16" y="16" width="468" height="438" />
        <line x1="16" y1="16" x2="484" y2="16" />
        <rect x="175" y="16" width="150" height="175" />
        <path d="M 175 191 A 75 75 0 0 0 325 191" />
        <circle cx="250" cy="191" r="75" />
        <circle cx="250" cy="48" r="7" />
        <line x1="232" y1="16" x2="232" y2="36" />
        <line x1="268" y1="16" x2="268" y2="36" />
        <path d="M 88 16 A 175 175 0 0 0 412 16" />
        <line x1="16" y1="454" x2="484" y2="454" />
        <circle cx="250" cy="454" r="55" />
      </g>
    </svg>
  );
}
