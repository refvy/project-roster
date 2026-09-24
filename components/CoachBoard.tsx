"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saveMatchdayFormation } from "@/app/actions/matchday";
import {
  BASKETBALL_LINES,
  BASKETBALL_SLOT_LAYOUT,
  describePitchNeed,
  fillPitch,
  firstName,
  getFormation,
  overflowBadgeLabel,
  parseFormation,
  type FormationId,
  type GoingPlayer,
  type PitchLine,
  type PitchSlot,
  FOOTBALL_FORMATIONS,
} from "@/lib/pitch";
import { RemoveRsvpButton } from "@/components/RemoveRsvpButton";
import { halfCourtGeometry } from "@/lib/court";
import { parseSport } from "@/lib/positions";

const TEAL = "#00D4C8";
const CREAM = "#f7f4ef";

export function CoachBoard({
  matchdayId,
  sport,
  formation: savedFormation,
  going,
  out = [],
  readOnly = false,
  share = false,
  canRemove = false,
}: {
  matchdayId: string;
  sport: string;
  formation: string;
  going: GoingPlayer[];
  out?: { id: string; name: string }[];
  readOnly?: boolean;
  share?: boolean;
  canRemove?: boolean;
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
  const [sheet, setSheet] = useState<{
    key: string;
    players: GoingPlayer[];
  } | null>(null);

  if (share) {
    return (
      <div data-testid="share-board" className="pointer-events-none w-full">
        {isBasketball ? (
          <HalfCourtBoard lines={lines} onOpenSlot={() => {}} compact />
        ) : (
          <HalfPitchBoard lines={lines} onOpenSlot={() => {}} compact />
        )}
      </div>
    );
  }

  return (
    <section data-testid="coach-board" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2
          data-testid="squad-heading"
          className="font-display text-2xl tracking-tight"
        >
          Squad
        </h2>
        {!isBasketball && !readOnly ? (
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

      {need && !readOnly ? (
        <p
          data-testid="coach-banner"
          className="rounded-2xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent-deep"
        >
          {need}
        </p>
      ) : null}

      {isBasketball ? (
        <HalfCourtBoard lines={lines} onOpenSlot={setSheet} />
      ) : (
        <HalfPitchBoard lines={lines} onOpenSlot={setSheet} />
      )}

      <AnyStrip
        any={any}
        overflow={bench.filter((p) => p.positionKey !== "ANY")}
        canRemove={canRemove}
        matchdayId={matchdayId}
      />

      <OutSection
        people={out}
        canRemove={canRemove}
        matchdayId={matchdayId}
      />

      {sheet ? (
        <SlotSheet
          slotKey={sheet.key}
          players={sheet.players}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </section>
  );
}

function HalfPitchBoard({
  lines,
  onOpenSlot,
  compact = false,
}: {
  lines: PitchLine[];
  onOpenSlot: (slot: { key: string; players: GoingPlayer[] }) => void;
  compact?: boolean;
}) {
  return (
    <div
      data-testid="half-pitch"
      className={`relative mx-auto w-full overflow-hidden rounded-3xl bg-cream ring-1 ring-accent/30 ${
        compact ? "max-w-[21rem]" : "max-w-md"
      }`}
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
                onOpen={() => onOpenSlot({ key: slot.key, players: slot.players })}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HalfCourtBoard({
  lines,
  onOpenSlot,
  compact = false,
}: {
  lines: PitchLine[];
  onOpenSlot: (slot: { key: string; players: GoingPlayer[] }) => void;
  compact?: boolean;
}) {
  const slots = lines.flatMap((line) => line.slots);
  return (
    <div
      data-testid="half-court"
      className={`relative mx-auto w-full overflow-hidden rounded-3xl bg-cream ring-1 ring-accent/30 ${
        compact ? "max-w-[21rem]" : "max-w-md"
      }`}
      style={{ aspectRatio: "400 / 510" }}
    >
      <HalfCourtMarks />
      <div className="absolute inset-0 z-10">
        {slots.map((slot, slotIndex) => {
          const pos = BASKETBALL_SLOT_LAYOUT[slot.key] ?? {
            top: "50%",
            left: "50%",
          };
          return (
            <div
              key={`${slot.key}-${slotIndex}`}
              data-testid={`bb-slot-${slot.key}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: pos.top, left: pos.left }}
            >
              <PitchSlotView
                slot={slot}
                index={slotIndex}
                onOpen={() =>
                  onOpenSlot({ key: slot.key, players: slot.players })
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnyStrip({
  any,
  overflow,
  canRemove = false,
  matchdayId,
}: {
  any: GoingPlayer[];
  overflow: GoingPlayer[];
  canRemove?: boolean;
  matchdayId: string;
}) {
  const people = [...any, ...overflow];
  return (
    <div
      data-testid="bench"
      className="rounded-2xl bg-cream px-4 py-3 ring-1 ring-accent/20"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        Bench
      </p>
      {people.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">Nobody on the bench yet.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {people.map((player) => (
            <li
              key={player.id}
              className="group inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm ring-1 ring-ink/10"
            >
              <span className="font-medium">{player.name}</span>
              <span
                className={
                  !player.positionKey || player.positionKey === "ANY"
                    ? "rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold tracking-wide text-on-accent"
                    : "rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold tracking-wide text-accent-deep"
                }
              >
                {!player.positionKey || player.positionKey === "ANY"
                  ? "Any"
                  : player.positionKey}
              </span>
              {canRemove ? (
                <RemoveRsvpButton
                  matchdayId={matchdayId}
                  rsvpId={player.id}
                  name={player.name}
                />
              ) : null}
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
  onOpen,
}: {
  slot: PitchSlot;
  index: number;
  onOpen: () => void;
}) {
  if (slot.players.length === 0) {
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

  const badge = overflowBadgeLabel(slot.players);
  const lead = slot.players[0]!;

  return (
    <button
      type="button"
      data-testid={`slot-filled-${slot.key}`}
      onClick={onOpen}
      className="relative flex min-h-14 min-w-14 flex-col items-center justify-center overflow-visible rounded-full bg-accent px-3 py-2 text-center sm:min-h-16 sm:min-w-16"
    >
      <span
        data-testid={`slot-lead-${slot.key}`}
        className="font-display whitespace-nowrap text-lg leading-none tracking-tight text-ink"
      >
        {firstName(lead.name)}
      </span>
      {badge ? (
        <span
          data-testid={`slot-overflow-${slot.key}`}
          className="chip-overflow absolute left-[85%] top-[15%] z-10 -translate-x-1/2 -translate-y-1/2 text-[1.25rem]"
        >
          {badge}
        </span>
      ) : null}
      <span
        data-testid={`slot-abbr-${slot.key}`}
        className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink sm:text-[11px]"
      >
        {slot.key}
      </span>
    </button>
  );
}

function SlotSheet({
  slotKey,
  players,
  onClose,
}: {
  slotKey: string;
  players: GoingPlayer[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-sheet-title"
        data-testid="slot-sheet"
        className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface px-5 py-5 shadow-banner sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3
            id="slot-sheet-title"
            className="font-display text-2xl tracking-tight"
          >
            {slotKey}
          </h3>
          <button
            type="button"
            data-testid="slot-sheet-close"
            onClick={onClose}
            className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          >
            Close
          </button>
        </div>
        <ul className="mt-4 divide-y divide-ink/10">
          {players.map((player) => (
            <li
              key={player.id}
              data-testid="slot-sheet-row"
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="text-lg font-medium">{player.name}</p>
                {player.addedByName ? (
                  <p className="mt-0.5 text-sm text-ink-soft">
                    added by {player.addedByName}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold tracking-wide text-accent-deep">
                {!player.positionKey || player.positionKey === "ANY"
                  ? slotKey
                  : player.positionKey}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function OutSection({
  people,
  canRemove = false,
  matchdayId,
}: {
  people: { id: string; name: string }[];
  canRemove?: boolean;
  matchdayId: string;
}) {
  const [open, setOpen] = useState(false);
  if (people.length === 0) return null;
  return (
    <div data-testid="out-section" className="rounded-2xl bg-cream ring-1 ring-ink/10">
      <button
        type="button"
        data-testid="out-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left"
      >
        <span className="text-sm font-semibold text-ink-soft">
          Out · {people.length}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`h-4 w-4 text-ink-soft transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul data-testid="out-list" className="border-t border-ink/10 px-4 py-2">
          {people.map((person) => (
            <li
              key={person.id}
              className="group flex items-center justify-between gap-3 py-2 text-sm font-medium"
            >
              <span>{person.name}</span>
              {canRemove ? (
                <RemoveRsvpButton
                  matchdayId={matchdayId}
                  rsvpId={person.id}
                  name={person.name}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
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
  const g = halfCourtGeometry();

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 510"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="400" height="510" fill={CREAM} />
      <g
        fill="none"
        stroke={TEAL}
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect
          x={g.left}
          y={g.top}
          width={g.right - g.left}
          height={g.bottom - g.top}
          rx="2"
        />
        <path d="M172 28 h56" strokeWidth="3.4" />
        <circle cx={g.hoopX} cy={g.hoopY} r="9" />
        <path data-testid="bb-restricted" d={g.restricted} />
        <rect x={g.keyX} y={g.top} width={g.keyW} height={g.keyH} />
        <path data-testid="bb-ft-arc" d={g.freeThrow} />
        <circle cx={g.hoopX} cy={g.keyBottom} r="3" fill={TEAL} stroke="none" />
        <path
          d={`M${g.keyX} ${g.top + 52} h-12 M${g.keyX + g.keyW} ${g.top + 52} h12 M${g.keyX} ${g.top + 94} h-12 M${g.keyX + g.keyW} ${g.top + 94} h12`}
        />
        <path data-testid="bb-3pt-left" d={g.threeLeft} />
        <path data-testid="bb-3pt-right" d={g.threeRight} />
        <path data-testid="bb-3pt" d={g.threeArc} />
        <line x1={g.left} y1={g.bottom} x2={g.right} y2={g.bottom} />
        <circle
          data-testid="bb-center-circle"
          cx={g.hoopX}
          cy={g.bottom}
          r="52"
        />
      </g>
    </svg>
  );
}
