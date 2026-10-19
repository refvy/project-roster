import type { ReactNode } from "react";
import { firstName } from "@/lib/pitch";
import { lineupLines, type LineupLine, type LineupSlotDef, type LineupSlotSnap } from "@/lib/lineup";

const TEAL = "#00D4C8";
const CREAM = "#f7f4ef";

export function LineupPitch({
  formation,
  slots,
  compact = false,
  fit = false,
  selectedSlotId = null,
  onSlot,
  testId = "lineup-pitch",
}: {
  formation: string;
  slots: LineupSlotSnap[];
  compact?: boolean;
  /** Scale the 3:4 pitch into the leftover editor height so GK sits above the footer. */
  fit?: boolean;
  selectedSlotId?: string | null;
  onSlot?: (slotId: string) => void;
  testId?: string;
}) {
  const byId = new Map(slots.map((slot) => [slot.id, slot]));
  const lines = lineupLines(formation);

  function renderChip(
    slot: (typeof lines)[number]["slots"][number],
    dense = false,
  ) {
    const snap = byId.get(slot.id);
    const name = snap?.name ?? null;
    const filled = Boolean(name);
    return (
      <SlotChip
        slotId={slot.id}
        slotKey={slot.key}
        name={name}
        compact={compact}
        fit={fit}
        dense={dense}
        selected={selectedSlotId === slot.id}
        interactive={Boolean(onSlot)}
        onClick={onSlot ? () => onSlot(slot.id) : undefined}
        filled={filled}
      />
    );
  }

  return (
    <div
      data-testid={testId}
      className={`relative overflow-hidden rounded-3xl bg-cream ring-1 ring-accent/30 ${
        fit
          ? "max-h-full"
          : compact
            ? "mx-auto w-full max-w-[18rem]"
            : "mx-auto w-full max-w-md"
      }`}
      style={
        fit
          ? {
              width: "min(100cqw, calc(100cqh * 3 / 4))",
              aspectRatio: "3 / 4",
            }
          : { aspectRatio: "3 / 4" }
      }
    >
      <HalfPitchMarks />
      {fit ? (
        <FitLines lines={lines} renderChip={renderChip} />
      ) : (
        <div
          className={`absolute inset-0 z-10 flex flex-col-reverse justify-between ${
            compact
              ? "px-1.5 pb-2.5 pt-6 sm:px-2.5 sm:pb-3 sm:pt-8"
              : "px-3 pb-5 pt-12 sm:px-4 sm:pb-6 sm:pt-14"
          }`}
        >
          {lines.map((line, lineIndex) => (
            <div
              key={`${line.area}-${lineIndex}`}
              className="flex items-center justify-evenly"
            >
              {line.slots.map((slot) => (
                <div key={slot.id}>{renderChip(slot)}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FitLines({
  lines,
  renderChip,
}: {
  lines: LineupLine[];
  renderChip: (slot: LineupSlotDef, dense: boolean) => ReactNode;
}) {
  const keeper = lines.filter((line) => line.area === "the keeper");
  const defence = lines.filter((line) => line.area === "defence");
  const midfield = lines.filter((line) => line.area === "midfield");
  const attack = lines.filter((line) => line.area === "attack");

  return (
    <div
      className="absolute inset-0 z-10 box-border flex flex-col-reverse"
      style={{ padding: "calc(4% + 8px)" }}
    >
      <div
        className="flex items-end justify-center pb-2.5"
        style={{ height: "13%" }}
      >
        {keeper.map((line, index) => (
          <EvenRow key={`${line.area}-${index}`} line={line} renderChip={renderChip} />
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col-reverse">
        <OutfieldBand lines={defence} renderChip={renderChip} />
        <OutfieldBand lines={midfield} renderChip={renderChip} />
        <OutfieldBand lines={attack} renderChip={renderChip} />
      </div>
    </div>
  );
}

function OutfieldBand({
  lines,
  renderChip,
}: {
  lines: LineupLine[];
  renderChip: (slot: LineupSlotDef, dense: boolean) => ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col-reverse justify-evenly">
      {lines.map((line, index) => (
        <EvenRow key={`${line.area}-${index}`} line={line} renderChip={renderChip} />
      ))}
    </div>
  );
}

function EvenRow({
  line,
  renderChip,
}: {
  line: LineupLine;
  renderChip: (slot: LineupSlotDef, dense: boolean) => ReactNode;
}) {
  const dense = line.slots.length >= 5;
  return (
    <div className="flex w-full min-w-0 items-center">
      {line.slots.map((slot) => (
        <div
          key={slot.id}
          className="flex min-w-0 flex-1 items-center justify-center"
        >
          {renderChip(slot, dense)}
        </div>
      ))}
    </div>
  );
}

/** Editor chip fills its cell minus a 4px gap. No fixed min-width, so a row of 5 can shrink. */
function fitChipClass() {
  return "lineup-fit-chip min-h-[38px] w-[calc(100%-4px)] min-w-0 max-w-full overflow-hidden py-1";
}

/** 14px, or 12px on a row of 5+ and on every row at 320px. Sized in globals.css. */
function fitNameClass() {
  return "lineup-fit-name block w-full min-w-0 truncate text-center font-display leading-none tracking-tight text-ink";
}

function chipFirstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

function SlotChip({
  slotId,
  slotKey,
  name,
  compact,
  fit = false,
  dense = false,
  selected,
  interactive,
  onClick,
  filled,
}: {
  slotId: string;
  slotKey: string;
  name: string | null;
  compact: boolean;
  fit?: boolean;
  dense?: boolean;
  selected: boolean;
  interactive: boolean;
  onClick?: () => void;
  filled: boolean;
}) {
  const size = compact
    ? "min-h-8 min-w-8 px-1.5 py-1"
    : fit
      ? fitChipClass()
      : "min-h-12 min-w-[3.5rem] px-2.5 py-1.5 sm:min-h-14 sm:min-w-[4rem]";
  const className = filled
    ? `flex flex-col items-center justify-center rounded-full bg-accent text-center ${size} ${
        selected ? "ring-4 ring-ink/20" : ""
      }`
    : `flex flex-col items-center justify-center rounded-full border-2 border-accent/40 bg-surface/70 text-center ${size} ${
        selected ? "ring-4 ring-accent/40" : ""
      }`;

  const inner = (
    <>
      {filled ? (
        <span
          data-testid={fit ? "lineup-slot-name" : undefined}
          className={
            fit
              ? fitNameClass()
              : `font-display leading-none tracking-tight text-ink ${
                  compact ? "text-[11px]" : "text-lg"
                }`
          }
        >
          {fit ? chipFirstName(name ?? "") : firstName(name ?? "")}
        </span>
      ) : (
        <span
          className={`max-w-full truncate font-medium uppercase tracking-wide text-ink/40 ${
            compact ? "text-[8px]" : fit ? "text-[10px]" : "text-[11px]"
          }`}
        >
          {slotKey}
        </span>
      )}
    </>
  );

  const denseAttr = fit ? (dense ? "true" : "false") : undefined;

  if (!interactive) {
    return (
      <div
        data-testid={`lineup-slot-${slotId}`}
        data-dense={denseAttr}
        className={className}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={`lineup-slot-${slotId}`}
      data-slot-key={slotKey}
      data-filled={filled ? "true" : "false"}
      data-dense={denseAttr}
      onClick={onClick}
      className={className}
    >
      {inner}
    </button>
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
