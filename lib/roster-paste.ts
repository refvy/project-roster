import type { Position } from "./positions";
import {
  MATCHDAY_TZ,
  displayVenueName,
  utcToBangkokParts,
  type WhenWhereFields,
} from "./when-where";

/**
 * Manager position-counts is one ` · ` line, not GK/CB sections.
 * Flat paste: `1. Dan · GK`. Flip if the summary grows real group headers.
 */
export const ROSTER_PASTE_GROUPED = false;

export function formatRosterPasteDate(utc: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MATCHDAY_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(utc);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

/** `3 Oct 2026 - 20:00–22:00`. Null when date/time is TBD. */
export function formatRosterPasteWhen(
  fields: Pick<WhenWhereFields, "startsAt" | "endsAt" | "hasTime">,
): string | null {
  if (!fields.startsAt) return null;
  const date = formatRosterPasteDate(fields.startsAt);
  if (fields.hasTime === false) return date;
  const start = utcToBangkokParts(fields.startsAt).time;
  if (!fields.endsAt) return `${date} - ${start}`;
  return `${date} - ${start}–${utcToBangkokParts(fields.endsAt).time}`;
}

/** Same label the Going list pill shows. */
export function rosterPastePositionLabel(
  positionKey: string | null | undefined,
  positions: Position[] = [],
) {
  if (!positionKey || positionKey === "ANY") return "Any";
  return positions.find((item) => item.key === positionKey)?.label ?? positionKey;
}

function positionBucketKey(positionKey: string | null | undefined) {
  if (!positionKey || positionKey === "ANY") return "ANY";
  return positionKey;
}

export function buildRosterNameLines(
  going: { name: string; positionKey?: string | null }[],
  positions: Position[],
  grouped = ROSTER_PASTE_GROUPED,
): string[] {
  if (!grouped || positions.length === 0) {
    return going.map(
      (player, index) =>
        `${index + 1}. ${player.name} · ${rosterPastePositionLabel(player.positionKey, positions)}`,
    );
  }

  const lines: string[] = [];
  const used = new Set<string>();
  for (const position of positions) {
    const names = going.filter(
      (player) => positionBucketKey(player.positionKey) === position.key,
    );
    if (names.length === 0) continue;
    used.add(position.key);
    lines.push(position.label);
    names.forEach((player, index) => {
      lines.push(`${index + 1}. ${player.name}`);
    });
  }
  going
    .filter((player) => !used.has(positionBucketKey(player.positionKey)))
    .forEach((player, index) => {
      lines.push(
        `${index + 1}. ${player.name} · ${rosterPastePositionLabel(player.positionKey, positions)}`,
      );
    });
  return lines;
}

export function buildRosterPaste(input: {
  title: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  hasTime?: boolean | null;
  venue?: string | null;
  place?: string | null;
  mapUrl?: string | null;
  going: { name: string; positionKey?: string | null }[];
  positions: Position[];
  grouped?: boolean;
}): string {
  const header: string[] = [];
  const title = input.title.trim();
  if (title) header.push(title);
  const when = formatRosterPasteWhen(input);
  if (when) header.push(when);

  const where: string[] = [];
  const venue = displayVenueName(input);
  if (venue) where.push(`@ ${venue}`);
  const map = input.mapUrl?.trim() ?? "";
  if (map) where.push(map);

  const names = buildRosterNameLines(
    input.going,
    input.positions,
    input.grouped ?? ROSTER_PASTE_GROUPED,
  );

  return [header, where, names]
    .filter((block) => block.length > 0)
    .map((block) => block.join("\n"))
    .join("\n\n");
}
