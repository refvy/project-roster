export type SportId = "football" | "basketball";

export type PositionRole = "special" | "field" | "flex";

export type Position = {
  key: string;
  label: string;
  role: PositionRole;
  group?: string;
};

export const SPORTS: { id: SportId; label: string }[] = [
  { id: "football", label: "Football" },
  { id: "basketball", label: "Basketball" },
];

/** Football chips. No RM/LM, no formation presets. */
export const FOOTBALL_POSITIONS: Position[] = [
  { key: "GK", label: "GK", role: "special", group: "keeper" },
  { key: "RB", label: "RB", role: "field", group: "backs" },
  { key: "CB", label: "CB", role: "field", group: "backs" },
  { key: "LB", label: "LB", role: "field", group: "backs" },
  { key: "RW", label: "RW", role: "field", group: "wings" },
  { key: "LW", label: "LW", role: "field", group: "wings" },
  { key: "CM", label: "CM", role: "field", group: "mids" },
  { key: "CAM", label: "CAM", role: "field", group: "mids" },
  { key: "CDM", label: "CDM", role: "field", group: "mids" },
  { key: "CF", label: "CF", role: "field", group: "forward" },
  { key: "ANY", label: "Any", role: "flex", group: "flex" },
];

export const BASKETBALL_POSITIONS: Position[] = [
  { key: "PG", label: "PG", role: "field", group: "guards" },
  { key: "SG", label: "SG", role: "field", group: "guards" },
  { key: "SF", label: "SF", role: "field", group: "wings" },
  { key: "PF", label: "PF", role: "field", group: "bigs" },
  { key: "C", label: "C", role: "field", group: "bigs" },
  { key: "ANY", label: "Any", role: "flex", group: "flex" },
];

export function parseSport(value: unknown): SportId {
  return value === "basketball" ? "basketball" : "football";
}

export function positionsForSport(sport: string): Position[] {
  return parseSport(sport) === "basketball"
    ? BASKETBALL_POSITIONS
    : FOOTBALL_POSITIONS;
}

export function sportLabel(sport: string) {
  return parseSport(sport) === "basketball" ? "Basketball" : "Football";
}

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
      const group =
        "group" in item && typeof item.group === "string"
          ? item.group
          : undefined;
      parsed.push({
        key: item.key,
        label: item.label,
        role: item.role,
        group,
      });
    }
  }
  return parsed.length > 0 ? parsed : FOOTBALL_POSITIONS;
}

export function isKnownPosition(
  positions: Position[],
  key: string | null | undefined,
) {
  if (!key) return false;
  return positions.some((position) => position.key === key);
}
