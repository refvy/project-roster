export type GoingPlayer = {
  id: string;
  name: string;
  positionKey: string | null;
};

export type PitchSlot = {
  key: string;
  player: GoingPlayer | null;
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
  { area: "guards", keys: ["PG", "SG"] },
  { area: "wings", keys: ["SF"] },
  { area: "the paint", keys: ["PF", "C"] },
];

export function getFormation(id: FormationId) {
  const found = FOOTBALL_FORMATIONS.find((item) => item.id === id);
  return found ?? FOOTBALL_FORMATIONS[0]!;
}

/** First-fit: Going player fills the first empty slot matching their chip. Any → bench. */
export function fillPitch(
  template: { area: PitchLine["area"]; keys: string[] }[],
  going: GoingPlayer[],
): { lines: PitchLine[]; bench: GoingPlayer[] } {
  const lines: PitchLine[] = template.map((line) => ({
    area: line.area,
    slots: line.keys.map((key) => ({ key, player: null })),
  }));
  const bench: GoingPlayer[] = [];

  for (const player of going) {
    const key = player.positionKey;
    if (!key || key === "ANY") {
      bench.push(player);
      continue;
    }
    let placed = false;
    for (const line of lines) {
      const slot = line.slots.find((item) => item.key === key && !item.player);
      if (slot) {
        slot.player = player;
        placed = true;
        break;
      }
    }
    if (!placed) bench.push(player);
  }

  return { lines, bench };
}

export function emptySlotCount(lines: PitchLine[]) {
  return lines.reduce(
    (sum, line) => sum + line.slots.filter((slot) => !slot.player).length,
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
  if (goingCount === 0) return "Pitch fills as players tap Going";
  const empty = emptySlotCount(lines);
  if (empty < 2) return null;

  const byArea = new Map<PitchLine["area"], number>();
  for (const line of lines) {
    const n = line.slots.filter((slot) => !slot.player).length;
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
