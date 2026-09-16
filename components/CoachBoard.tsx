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

const TEAL = "#00D4C8";
const CREAM = "#f7f4ef";

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

      <AnyStrip
        any={any}
        overflow={bench.filter((p) => p.positionKey !== "ANY")}
      />
    </section>
  );
}

function HalfPitchBoard({ lines }: { lines: PitchLine[] }) {
  return (
    <div
      data-testid="half-pitch"
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-cream ring-1 ring-accent/30"
      style={{ aspectRatio: "3 / 4" }}
    >
      <HalfPitchMarks />
      <div className="absolute inset-0 z-10 flex flex-col-reverse justify-between px-3 pb-5 pt-12 sm:px-4 sm:pb-6 sm:pt-14">
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
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl bg-cream ring-1 ring-accent/30"
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
  return (
    <div
      data-testid="bench"
      className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-accent/20"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        Bench / Any
      </p>
      {people.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">Nobody on the bench yet.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {people.map((player) => (
            <li
              key={player.id}
              className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm ring-1 ring-ink/10"
            >
              <span className="font-medium">{player.name}</span>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold tracking-wide text-accent-deep">
                {!player.positionKey || player.positionKey === "ANY"
                  ? "Any"
                  : player.positionKey}
              </span>
            </li>
          ))}
        </ul>
      )}
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
      className="flex min-h-12 min-w-[3.75rem] flex-col items-center justify-center rounded-full border-2 border-accent/40 bg-surface/70 px-2.5 py-1.5 text-center sm:min-h-14 sm:min-w-[4.25rem]"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink/40">
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
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="600" height="800" fill={CREAM} />
      <g fill="none" stroke={TEAL} strokeWidth="2" strokeLinejoin="round">
        <rect x="24" y="24" width="552" height="752" rx="2" />
        <rect x="224" y="698" width="152" height="78" />
        <rect x="136" y="548" width="328" height="228" />
        <path d="M258 776 h84 v16 h-84 z" />
        <circle cx="300" cy="624" r="3.2" fill={TEAL} stroke="none" />
        <path d="M214 548 A 86 86 0 0 1 386 548" />
        <path d="M214 24 A 86 86 0 0 0 386 24" />
        <circle cx="300" cy="24" r="3.2" fill={TEAL} stroke="none" />
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
      <rect width="500" height="470" fill={CREAM} />
      <g fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round">
        <rect x="16" y="16" width="468" height="438" rx="2" />
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
