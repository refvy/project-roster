export const LINEUP_CAP = 4;

export type LineupFormationId =
  | "4-4-2"
  | "4-3-3"
  | "4-1-4-1"
  | "3-5-2"
  | "4-2-3-1";

/** Chips for new creates / edits. 4-2-3-1 is legacy display-only. */
export const LINEUP_FORMATION_CHIPS: Exclude<
  LineupFormationId,
  "4-2-3-1"
>[] = ["4-4-2", "4-3-3", "4-1-4-1", "3-5-2"];

export type LineupSlotDef = {
  id: string;
  key: string;
};

export type LineupLine = {
  area: "the keeper" | "defence" | "midfield" | "attack";
  slots: LineupSlotDef[];
};

export type LineupGoing = {
  id: string;
  name: string;
  positionKey: string | null;
};

export type LineupSlotSnap = {
  id: string;
  key: string;
  rsvpId: string | null;
  name: string | null;
};

export type LineupBenchSnap = {
  rsvpId: string;
  name: string;
};

export const LINEUP_FORMATIONS: {
  id: LineupFormationId;
  label: LineupFormationId;
  lines: { area: LineupLine["area"]; keys: string[] }[];
}[] = [
  {
    id: "4-4-2",
    label: "4-4-2",
    lines: [
      { area: "the keeper", keys: ["GK"] },
      { area: "defence", keys: ["LB", "CB", "CB", "RB"] },
      { area: "midfield", keys: ["LW", "CM", "CM", "RW"] },
      { area: "attack", keys: ["ST", "ST"] },
    ],
  },
  {
    id: "4-3-3",
    label: "4-3-3",
    lines: [
      { area: "the keeper", keys: ["GK"] },
      { area: "defence", keys: ["LB", "CB", "CB", "RB"] },
      { area: "midfield", keys: ["CM", "CM", "CM"] },
      { area: "attack", keys: ["LW", "ST", "RW"] },
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
      { area: "attack", keys: ["ST"] },
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    lines: [
      { area: "the keeper", keys: ["GK"] },
      { area: "defence", keys: ["LB", "CB", "CB", "RB"] },
      { area: "midfield", keys: ["CM", "CM"] },
      { area: "midfield", keys: ["LW", "CAM", "RW"] },
      { area: "attack", keys: ["ST"] },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    lines: [
      { area: "the keeper", keys: ["GK"] },
      { area: "defence", keys: ["CB", "CB", "CB"] },
      { area: "midfield", keys: ["LW", "CM", "CAM", "CM", "RW"] },
      { area: "attack", keys: ["ST", "ST"] },
    ],
  },
];

export function parseLineupFormation(value: unknown): LineupFormationId {
  if (
    value === "4-4-2" ||
    value === "4-3-3" ||
    value === "4-1-4-1" ||
    value === "4-2-3-1" ||
    value === "3-5-2"
  ) {
    return value;
  }
  return "4-3-3";
}

export function getLineupFormation(id: LineupFormationId) {
  return (
    LINEUP_FORMATIONS.find((item) => item.id === id) ??
    LINEUP_FORMATIONS.find((item) => item.id === "4-3-3")!
  );
}

export function lineupLines(formation: unknown): LineupLine[] {
  const parsed = parseLineupFormation(formation);
  return getLineupFormation(parsed).lines.map((line, lineIndex) => ({
    area: line.area,
    slots: line.keys.map((key, slotIndex) => ({
      id: `${parsed}-${lineIndex}-${slotIndex}-${key}`,
      key,
    })),
  }));
}

export function flatLineupSlots(formation: unknown): LineupSlotDef[] {
  return lineupLines(formation).flatMap((line) => line.slots);
}

export function emptyLineupSlots(formation: unknown): LineupSlotSnap[] {
  return flatLineupSlots(formation).map((slot) => ({
    id: slot.id,
    key: slot.key,
    rsvpId: null,
    name: null,
  }));
}

/** Formation change mid-edit: wipe every assignment. Do not rematch by label. */
export function clearLineupSlots(formation: unknown): LineupSlotSnap[] {
  return emptyLineupSlots(formation);
}

export function assignedRsvpIds(slots: LineupSlotSnap[]) {
  return new Set(
    slots.map((slot) => slot.rsvpId).filter((id): id is string => Boolean(id)),
  );
}

/** Bench = Going − XI, same snapshot moment. Out is never in `going`. */
export function snapshotBench(
  going: LineupGoing[],
  slots: LineupSlotSnap[],
): LineupBenchSnap[] {
  const taken = assignedRsvpIds(slots);
  return going
    .filter((player) => !taken.has(player.id))
    .map((player) => ({ rsvpId: player.id, name: player.name }));
}

export function assignToSlot(
  slots: LineupSlotSnap[],
  slotId: string,
  person: LineupGoing | null,
): LineupSlotSnap[] {
  return slots.map((slot) => {
    if (person && slot.rsvpId === person.id) {
      return { ...slot, rsvpId: null, name: null };
    }
    if (slot.id !== slotId) return slot;
    if (!person) return { ...slot, rsvpId: null, name: null };
    return { ...slot, rsvpId: person.id, name: person.name };
  });
}

export function poolForEditor(going: LineupGoing[], slots: LineupSlotSnap[]) {
  const taken = assignedRsvpIds(slots);
  return going.filter((player) => !taken.has(player.id));
}

export function hydrateEditorSlots(
  formation: unknown,
  saved: LineupSlotSnap[],
  going: LineupGoing[],
): LineupSlotSnap[] {
  const goingById = new Map(going.map((player) => [player.id, player]));
  const savedById = new Map(saved.map((slot) => [slot.id, slot]));
  return emptyLineupSlots(formation).map((slot) => {
    const previous = savedById.get(slot.id);
    if (!previous?.rsvpId) return slot;
    const live = goingById.get(previous.rsvpId);
    if (!live) return slot;
    return { ...slot, rsvpId: live.id, name: live.name };
  });
}

export function suggestedLineupName(existing: string[]) {
  const used = new Set(existing.map((name) => name.trim().toLowerCase()));
  for (let i = 1; i <= LINEUP_CAP + 4; i += 1) {
    const name = `Q${i}`;
    if (!used.has(name.toLowerCase())) return name;
  }
  return "Q1";
}

export function parseLineupSlots(value: unknown): LineupSlotSnap[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const rec = row as Record<string, unknown>;
    if (typeof rec.id !== "string" || typeof rec.key !== "string") return [];
    return [
      {
        id: rec.id,
        key: rec.key,
        rsvpId: typeof rec.rsvpId === "string" ? rec.rsvpId : null,
        name: typeof rec.name === "string" ? rec.name : null,
      },
    ];
  });
}

export function parseLineupBench(value: unknown): LineupBenchSnap[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const rec = row as Record<string, unknown>;
    if (typeof rec.name !== "string") return [];
    return [
      {
        rsvpId: typeof rec.rsvpId === "string" ? rec.rsvpId : "",
        name: rec.name,
      },
    ];
  });
}

export function positionHint(positionKey: string | null | undefined) {
  if (!positionKey || positionKey === "ANY") return "Any";
  return positionKey;
}
