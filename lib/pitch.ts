import { parseSport } from "./positions";

export type GoingPlayer = {
  id: string;
  name: string;
  positionKey: string | null;
  addedByName?: string | null;
};

export type PitchSlot = {
  key: string;
  players: GoingPlayer[];
};

/** Names shown on a slot chip; extras collapse to +N (N = total − 1). */
export const SLOT_STACK_VISIBLE = 1;

/**
 * Compatible fill when the active formation has no exact slot for the chip.
 * CAM/CDM → CM; LW ↔ LM; RW ↔ RM.
 */
export const COMPATIBLE_POSITIONS: Record<string, string[]> = {
  CAM: ["CM"],
  CDM: ["CM"],
  LW: ["LM"],
  RW: ["RM"],
  LM: ["LW"],
  RM: ["RW"],
};

export type PitchLine = {
  area: "the keeper" | "defence" | "midfield" | "attack" | "guards" | "wings" | "the paint";
  slots: PitchSlot[];
};

export type FormationId = "4-3-3" | "4-4-2" | "4-1-4-1" | "3-5-2";

export const FOOTBALL_FORMATIONS: {
  id: FormationId;
  label: string;
  lines: { area: PitchLine["area"]; keys: string[] }[];
}[] = [
  {
    id: "4-3-3",
    label: "4-3-3",
    lines: [
      { area: "the keeper", keys: ["GK"] },
      { area: "defence", keys: ["LB", "CB", "CB", "RB"] },
      { area: "midfield", keys: ["CM", "CM", "CM"] },
      { area: "attack", keys: ["LW", "CF", "RW"] },
    ],
  },
  {
    id: "4-4-2",
    label: "4-4-2",
    lines: [
      { area: "the keeper", keys: ["GK"] },
      { area: "defence", keys: ["LB", "CB", "CB", "RB"] },
      { area: "midfield", keys: ["LW", "CM", "CM", "RW"] },
      { area: "attack", keys: ["CF", "CF"] },
    ],
  },
  {
    id: "4-1-4-1",
    label: "4-1-4-1",
    lines: [
      { area: "the keeper", keys: ["GK"] },
      { area: "defence", keys: ["LB", "CB", "CB", "RB"] },
      { area: "midfield", keys: ["CDM"] },
      { area: "midfield", keys: ["LW", "CM", "CM", "RW"] },
      { area: "attack", keys: ["CF"] },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    lines: [
      { area: "the keeper", keys: ["GK"] },
      { area: "defence", keys: ["CB", "CB", "CB"] },
      { area: "midfield", keys: ["LW", "CM", "CDM", "CM", "RW"] },
      { area: "attack", keys: ["CF", "CF"] },
    ],
  },
];

export const BASKETBALL_LINES: { area: PitchLine["area"]; keys: string[] }[] = [
  { area: "the paint", keys: ["C"] },
  { area: "wings", keys: ["PF", "SF"] },
  { area: "guards", keys: ["SG", "PG"] },
];

/** Percent positions on the half-court: C at the rim, PF/SF wide, SG/PG closer. */
export const BASKETBALL_SLOT_LAYOUT: Record<string, { top: string; left: string }> =
  {
    C: { top: "18%", left: "50%" },
    PF: { top: "34%", left: "16%" },
    SF: { top: "34%", left: "84%" },
    SG: { top: "54%", left: "34%" },
    PG: { top: "54%", left: "66%" },
  };

export function getFormation(id: FormationId) {
  const found = FOOTBALL_FORMATIONS.find((item) => item.id === id);
  return found ?? FOOTBALL_FORMATIONS[0]!;
}

export function parseFormation(value: unknown): FormationId {
  if (
    value === "4-3-3" ||
    value === "4-4-2" ||
    value === "4-1-4-1" ||
    value === "3-5-2"
  ) {
    return value;
  }
  return "4-3-3";
}

export function pitchTemplate(sport: string, formation: unknown) {
  return parseSport(sport) === "basketball"
    ? BASKETBALL_LINES
    : getFormation(parseFormation(formation)).lines;
}

/** First token of the name, capped at 8 chars for compact slot chips. */
export function firstName(name: string) {
  const token = name.trim().split(/\s+/)[0] ?? "";
  return token.length > 8 ? token.slice(0, 8) : token;
}

export function slotOverflowCount(players: GoingPlayer[]) {
  return Math.max(0, players.length - SLOT_STACK_VISIBLE);
}

/** +N extras on a chip. Caps at +9; more than 9 extras → 9+. */
export function overflowBadgeLabel(players: GoingPlayer[]) {
  const extra = slotOverflowCount(players);
  if (extra <= 0) return null;
  if (extra > 9) return "9+";
  return `+${extra}`;
}

/** Back→front slot order (including Any who filled vacancies), then leftover Any / unmatched. */
export function orderGoingForRoster(
  going: GoingPlayer[],
  sport: string,
  formation: unknown,
): GoingPlayer[] {
  const { lines, bench } = fillPitch(pitchTemplate(sport, formation), going);
  const placed: GoingPlayer[] = [];
  for (const line of lines) {
    for (const slot of line.slots) {
      placed.push(...slot.players);
    }
  }
  return [...placed, ...bench];
}

/**
 * Fill order: exact position → compatible position → Any vacancies.
 * Named-position overflow stacks on the slot (+N). Bench = leftover Any + unmatched.
 */
export function fillPitch(
  template: { area: PitchLine["area"]; keys: string[] }[],
  going: GoingPlayer[],
): { lines: PitchLine[]; bench: GoingPlayer[]; any: GoingPlayer[] } {
  const lines: PitchLine[] = template.map((line) => ({
    area: line.area,
    slots: line.keys.map((key) => ({ key, players: [] })),
  }));
  const placed = new Set<string>();

  const named = going.filter(
    (player) => player.positionKey && player.positionKey !== "ANY",
  );
  for (const player of named) {
    const matching = slotsWithKey(lines, player.positionKey!);
    if (matching.length === 0) continue;
    pickFewest(matching).players.push(player);
    placed.add(player.id);
  }

  for (const player of named) {
    if (placed.has(player.id)) continue;
    const alts = (COMPATIBLE_POSITIONS[player.positionKey!] ?? []).flatMap(
      (key) => slotsWithKey(lines, key),
    );
    if (alts.length === 0) continue;
    pickFewest(alts).players.push(player);
    placed.add(player.id);
  }

  const leftoverAny: GoingPlayer[] = [];
  for (const player of going) {
    if (player.positionKey && player.positionKey !== "ANY") continue;
    const vacancy = allSlots(lines).find((slot) => slot.players.length === 0);
    if (vacancy) {
      vacancy.players.push(player);
      placed.add(player.id);
    } else {
      leftoverAny.push(player);
    }
  }

  const unmatched = named.filter((player) => !placed.has(player.id));
  const bench = [...leftoverAny, ...unmatched];
  return { lines, bench, any: leftoverAny };
}

function allSlots(lines: PitchLine[]) {
  return lines.flatMap((line) => line.slots);
}

function slotsWithKey(lines: PitchLine[], key: string) {
  return allSlots(lines).filter((slot) => slot.key === key);
}

function pickFewest(slots: PitchSlot[]) {
  let target = slots[0]!;
  for (const slot of slots) {
    if (slot.players.length < target.players.length) target = slot;
  }
  return target;
}

export function emptySlotCount(lines: PitchLine[]) {
  return lines.reduce(
    (sum, line) => sum + line.slots.filter((slot) => slot.players.length === 0).length,
    0,
  );
}

const AREA_TIEBREAK: PitchLine["area"][] = [
  "defence",
  "the paint",
  "midfield",
  "guards",
  "wings",
  "attack",
  "the keeper",
];

export function describePitchNeed(
  lines: PitchLine[],
  goingCount: number,
): string | null {
  if (goingCount === 0) return "Squad fills as players tap Going";
  const empty = emptySlotCount(lines);
  if (empty < 2) return null;

  const byArea = new Map<PitchLine["area"], number>();
  for (const line of lines) {
    const n = line.slots.filter((slot) => slot.players.length === 0).length;
    if (n === 0) continue;
    byArea.set(line.area, (byArea.get(line.area) ?? 0) + n);
  }
  let lightest: PitchLine["area"] | null = null;
  let lightestCount = -1;
  for (const area of AREA_TIEBREAK) {
    const n = byArea.get(area) ?? 0;
    if (n > lightestCount) {
      lightest = area;
      lightestCount = n;
    }
  }
  const area = lightest ?? "defence";
  return `${empty} slots open · light on ${area}`;
}
