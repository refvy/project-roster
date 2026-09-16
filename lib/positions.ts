export type PositionRole = "special" | "field" | "flex";

export type Position = {
  key: string;
  label: string;
  role: PositionRole;
};

/** Football defaults. Other sports swap this list on Matchday.positions. */
export const FOOTBALL_POSITIONS: Position[] = [
  { key: "GK", label: "GK", role: "special" },
  { key: "DEF", label: "DEF", role: "field" },
  { key: "MID", label: "MID", role: "field" },
  { key: "FWD", label: "FWD", role: "field" },
  { key: "ANY", label: "Any", role: "flex" },
];

export function parsePositions(value: unknown): Position[] {
  if (!Array.isArray(value)) return FOOTBALL_POSITIONS;
  const parsed: Position[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      "key" in item &&
      "label" in item &&
      "role" in item &&
      typeof item.key === "string" &&
      typeof item.label === "string" &&
      (item.role === "special" || item.role === "field" || item.role === "flex")
    ) {
      parsed.push({ key: item.key, label: item.label, role: item.role });
    }
  }
  return parsed.length > 0 ? parsed : FOOTBALL_POSITIONS;
}

export function isKnownPosition(positions: Position[], key: string | null | undefined) {
  if (!key) return false;
  return positions.some((position) => position.key === key);
}
