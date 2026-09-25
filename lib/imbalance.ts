import type { Position } from "./positions";
import { parseSport } from "./positions";

type GroupSpec = {
  key: string;
  keys: string[];
  special?: boolean;
  /** "too-many" → Too many GKs; "count" → 3 PGs; "heavy" → Heavy on CMs */
  lead?: "too-many" | "count" | "heavy";
  heavyLabel?: string;
  needPhrase?: (counts: Map<string, number>) => string | null;
};

const FOOTBALL_GROUPS: GroupSpec[] = [
  { key: "keeper", keys: ["GK"], special: true, lead: "too-many" },
  {
    key: "backs",
    keys: ["RB", "CB", "LB"],
    lead: "heavy",
    heavyLabel: "backs",
    needPhrase: (counts) => {
      if ((counts.get("CB") ?? 0) === 0) return "need a CB";
      if ((counts.get("LB") ?? 0) === 0) return "need a LB";
      if ((counts.get("RB") ?? 0) === 0) return "need a RB";
      return null;
    },
  },
  {
    key: "wings",
    keys: ["RW", "LW"],
    lead: "heavy",
    heavyLabel: "wings",
    needPhrase: () => "light on wings",
  },
  {
    key: "mids",
    keys: ["CM", "CAM", "CDM"],
    lead: "heavy",
    heavyLabel: "CMs",
    needPhrase: (counts) => {
      const empty = ["CM", "CAM", "CDM"].find((key) => (counts.get(key) ?? 0) === 0);
      return empty ? `need a ${empty}` : null;
    },
  },
  {
    key: "forward",
    keys: ["CF"],
    lead: "heavy",
    heavyLabel: "CFs",
    needPhrase: () => "need a CF",
  },
];

const BASKETBALL_GROUPS: GroupSpec[] = [
  {
    key: "guards",
    keys: ["PG", "SG"],
    lead: "count",
    heavyLabel: "guards",
    needPhrase: (counts) => {
      if ((counts.get("PG") ?? 0) === 0) return "need a PG";
      if ((counts.get("SG") ?? 0) === 0) return "need a SG";
      return null;
    },
  },
  {
    key: "wings",
    keys: ["SF"],
    lead: "heavy",
    heavyLabel: "wings",
    needPhrase: () => "need a SF",
  },
  {
    key: "bigs",
    keys: ["PF", "C"],
    lead: "heavy",
    heavyLabel: "bigs",
    needPhrase: () => "need a big",
  },
];

/**
 * Soft imbalance (Going RSVPs only; Any ignored). No formation/pitch.
 *
 * Football groups: GK | backs (RB/CB/LB) | wings (RW/LW) | mids (CM/CAM/CDM) | CF
 * Basketball groups: guards (PG/SG) | wings (SF) | bigs (PF/C)
 *
 * 1. GK count > 1 → "Too many GKs". If CB is also 0 → "· need a CB".
 * 2. A single named spot ≥ 3 → "3 on LW · light on RW" (empty sibling in the
 *    same group). Otherwise group heavy/light as below.
 * 3. A field group is heavy if its total is ≥ 3, or one spot in it is ≥ 2
 *    and the group is at least 2 above the lightest other field group.
 * 4. A field group is light if its total is 0 while some field player is Going.
 * 5. Lead copy: "3 PGs" when a count-style group is dominated by one spot;
 *    otherwise "Heavy on CMs". Need copy: "light on wings", "need a big",
 *    "need a CB". Fragments join with " · ".
 */
export function describeImbalance(
  going: { positionKey: string | null }[],
  positions: Position[],
  sport: string = "football",
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

  const groups =
    parseSport(sport) === "basketball" ? BASKETBALL_GROUPS : FOOTBALL_GROUPS;
  const knownKeys = new Set(positions.map((position) => position.key));
  const active = groups.filter((group) =>
    group.keys.some((key) => knownKeys.has(key)),
  );

  if (active.length < 2) {
    return genericFieldSkew(counts, positions);
  }

  const stacked = stackedSlotCopy(counts, active);

  const parts: string[] = [];
  const special = active.filter((group) => group.special);
  const field = active.filter((group) => !group.special);

  for (const group of special) {
    const total = groupTotal(group, counts);
    if (total > 1) {
      const label = group.keys[0] ?? group.key;
      parts.push(`Too many ${pluralizeLabel(label)}`);
    }
  }

  if (stacked) {
    for (const bit of stacked) {
      if (!parts.includes(bit)) parts.push(bit);
    }
    return parts.join(" · ");
  }

  const fieldGoing = field.reduce(
    (sum, group) => sum + groupTotal(group, counts),
    0,
  );
  const totals = field.map((group) => ({
    group,
    total: groupTotal(group, counts),
    maxKey: dominantKey(group, counts),
    maxCount: dominantCount(group, counts),
  }));
  const minTotal = totals.length
    ? Math.min(...totals.map((item) => item.total))
    : 0;

  const heavy = totals.filter((item) => {
    if (item.total >= 3) return true;
    if (item.maxCount >= 2 && item.total >= minTotal + 2 && item.total >= 2) {
      return true;
    }
    return false;
  });
  const light = totals.filter((item) => item.total === 0 && fieldGoing > 0);

  if (parts.length === 0 && heavy.length > 0) {
    const top = [...heavy].sort((a, b) => b.total - a.total)[0];
    if (top) {
      if (top.group.lead === "count" && top.maxKey && top.maxCount >= 2) {
        parts.push(`${top.maxCount} ${pluralizeLabel(top.maxKey)}`);
      } else if (top.group.heavyLabel) {
        parts.push(`Heavy on ${top.group.heavyLabel}`);
      }
    }
  }

  const gkOverflow = (counts.get("GK") ?? 0) > 1;
  if (gkOverflow && knownKeys.has("CB") && (counts.get("CB") ?? 0) === 0) {
    parts.push("need a CB");
  } else if (heavy.length > 0 && light.length > 0) {
    const need = pickNeed(light, heavy, counts);
    if (need && !parts.includes(need)) parts.push(need);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function stackedSlotCopy(
  counts: Map<string, number>,
  groups: GroupSpec[],
): string[] | null {
  let bestKey: string | null = null;
  let best = 0;
  for (const group of groups) {
    if (group.special) continue;
    for (const key of group.keys) {
      const n = counts.get(key) ?? 0;
      if (n > best) {
        best = n;
        bestKey = key;
      }
    }
  }
  if (best < 3 || !bestKey) return null;
  const bits = [`${best} on ${bestKey}`];
  const group = groups.find((item) => item.keys.includes(bestKey));
  const sibling = group?.keys.find(
    (key) => key !== bestKey && (counts.get(key) ?? 0) === 0,
  );
  if (sibling) {
    bits.push(`light on ${sibling}`);
    return bits;
  }
  const field = groups.filter((item) => !item.special);
  const light = field
    .map((item) => ({ group: item, total: groupTotal(item, counts) }))
    .filter((item) => item.total === 0);
  const heavy = field
    .map((item) => ({
      group: item,
      total: groupTotal(item, counts),
      maxKey: dominantKey(item, counts),
      maxCount: dominantCount(item, counts),
    }))
    .filter((item) => item.total >= 3);
  const need = pickNeed(light, heavy, counts);
  if (need) bits.push(need);
  return bits;
}

function pickNeed(
  light: { group: GroupSpec; total: number }[],
  heavy: { group: GroupSpec; total: number }[],
  counts: Map<string, number>,
) {
  const lightKeys = new Set(light.map((item) => item.group.key));
  const heavyKeys = new Set(heavy.map((item) => item.group.key));

  if (heavyKeys.has("mids") && lightKeys.has("wings")) {
    return "light on wings";
  }
  if (lightKeys.has("bigs")) return "need a big";
  if (lightKeys.has("wings")) {
    const wings = light.find((item) => item.group.key === "wings");
    return wings?.group.needPhrase?.(counts) ?? "light on wings";
  }
  if (lightKeys.has("backs")) {
    return light.find((item) => item.group.key === "backs")?.group.needPhrase?.(
      counts,
    ) ?? "need a CB";
  }
  return light[0]?.group.needPhrase?.(counts) ?? null;
}

function groupTotal(group: GroupSpec, counts: Map<string, number>) {
  return group.keys.reduce((sum, key) => sum + (counts.get(key) ?? 0), 0);
}

function dominantKey(group: GroupSpec, counts: Map<string, number>) {
  let best: string | null = null;
  let bestCount = -1;
  for (const key of group.keys) {
    const count = counts.get(key) ?? 0;
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function dominantCount(group: GroupSpec, counts: Map<string, number>) {
  return Math.max(...group.keys.map((key) => counts.get(key) ?? 0), 0);
}

function genericFieldSkew(
  counts: Map<string, number>,
  positions: Position[],
): string | null {
  const parts: string[] = [];
  for (const position of positions) {
    if (position.role !== "special") continue;
    const count = counts.get(position.key) ?? 0;
    if (count > 1) parts.push(`Too many ${pluralizeLabel(position.label)}`);
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
