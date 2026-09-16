import type { Position } from "./positions";

/**
 * Position imbalance (Going RSVPs only).
 *
 * Documented rule:
 * 1. "Any" / flex positions are ignored — they do not count toward skew.
 * 2. Special positions (football default: GK): if count > 1, warn
 *    "Too many GKs" (label + "s").
 * 3. Field positions (football default: DEF / MID / FWD): if the highest
 *    count is at least 2, and at least 2 more than the lowest count,
 *    warn "Too many {overloaded}s · need a {needed}".
 * 4. Fragments are joined with " · ".
 *
 * Example: two GKs and no DEF while MID/FWD are thin →
 * "Too many GKs · need a DEF" when field skew also fires; two GKs alone
 * with a single MID still yields "Too many GKs".
 */
export function describeImbalance(
  going: { positionKey: string | null }[],
  positions: Position[],
): string | null {
  const counts = new Map<string, number>();
  for (const position of positions) {
    counts.set(position.key, 0);
  }

  for (const rsvp of going) {
    if (!rsvp.positionKey) continue;
    const position = positions.find((item) => item.key === rsvp.positionKey);
    if (!position || position.role === "flex") continue;
    counts.set(position.key, (counts.get(position.key) ?? 0) + 1);
  }

  const parts: string[] = [];

  for (const position of positions) {
    if (position.role !== "special") continue;
    const count = counts.get(position.key) ?? 0;
    if (count > 1) {
      parts.push(`Too many ${pluralizeLabel(position.label)}`);
    }
  }

  const field = positions.filter((position) => position.role === "field");
  if (field.length >= 2) {
    const scored = field.map((position) => ({
      position,
      count: counts.get(position.key) ?? 0,
    }));
    const max = Math.max(...scored.map((item) => item.count));
    const min = Math.min(...scored.map((item) => item.count));
    if (max >= 2 && max >= min + 2) {
      const overloaded = scored.filter((item) => item.count === max);
      const needed = scored.filter((item) => item.count === min);
      for (const item of overloaded) {
        const fragment = `Too many ${pluralizeLabel(item.position.label)}`;
        if (!parts.includes(fragment)) parts.push(fragment);
      }
      for (const item of needed) {
        parts.push(`need a ${item.position.label}`);
      }
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function pluralizeLabel(label: string) {
  if (label.endsWith("s")) return label;
  return `${label}s`;
}
