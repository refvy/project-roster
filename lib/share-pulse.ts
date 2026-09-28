import { describeImbalance } from "./imbalance";
import { pitchTemplate } from "./pitch";
import { parsePositions } from "./positions";
import { formatWhenWhereLine, matchdayWhenWhereLine } from "./when-where";

/** Dan locked mock (via Steve): white fill + thick coral border, coral copy, tilt −12°. */
export const STAMP_CORAL = "#FF5A3D";
/** Dan locked mock: white fill + thick teal border. */
export const STAMP_TEAL = "#00D4C8";
export const STAMP_INK = "#1a1714";
/** Muted Out line on the Enough stamp. */
export const STAMP_OUT_GRAY = "#6B7280";
export const STAMP_LOW_TILT_DEG = -12;
export const STAMP_ENOUGH_TILT_DEG = 12;
export const STAMP_BORDER_PX = 14;

export type StampKind = "low" | "enough-out" | "enough";

export type StampLine = {
  text: string;
  color: string;
};

export type StampView = {
  kind: StampKind;
  tiltDeg: number;
  border: string;
  fill: "#ffffff";
  line1: StampLine;
  line2: StampLine | null;
};

export type SharePulseInput = {
  title: string;
  sport: string;
  formation: string;
  whenWhere: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  hasTime?: boolean | null;
  place?: string | null;
  venue?: string | null;
  mapUrl?: string | null;
  positions: unknown;
  rsvps: { status: "GOING" | "OUT"; positionKey: string | null }[];
};

/**
 * Squad size for the Low stamp. No capacity field — football formations
 * are 11 slots, basketball is 5.
 */
export function squadCapacity(sport: string, formation: unknown) {
  return pitchTemplate(sport, formation).reduce(
    (sum, line) => sum + line.keys.length,
    0,
  );
}

export function signupTitle(matchTitle: string) {
  return `Signup now for ${matchTitle} — powered by SKWAD`;
}

export function stampKind(
  going: number,
  out: number,
  capacity: number,
): StampKind | null {
  if (going + out <= 0) return null;
  if (going < capacity) return "low";
  if (out > 0) return "enough-out";
  return "enough";
}

export function needMoreCount(going: number, capacity: number) {
  return Math.max(0, capacity - going);
}

/**
 * Sale-stamp overlay. White fill + thick colored border (not a solid pill).
 * Low: NEED / n MORE, coral, −12°. Enough: n GOING (+ n OUT), teal, +12°.
 */
export function stampView(
  going: number,
  out: number,
  capacity: number,
): StampView | null {
  const kind = stampKind(going, out, capacity);
  if (!kind) return null;
  if (kind === "low") {
    return {
      kind,
      tiltDeg: STAMP_LOW_TILT_DEG,
      border: STAMP_CORAL,
      fill: "#ffffff",
      line1: { text: "NEED", color: STAMP_CORAL },
      line2: {
        text: `${needMoreCount(going, capacity)} MORE`,
        color: STAMP_CORAL,
      },
    };
  }
  const goingLine: StampLine = {
    text: `${going} GOING`,
    color: STAMP_INK,
  };
  if (kind === "enough-out") {
    return {
      kind,
      tiltDeg: STAMP_ENOUGH_TILT_DEG,
      border: STAMP_TEAL,
      fill: "#ffffff",
      line1: goingLine,
      line2: { text: `${out} OUT`, color: STAMP_OUT_GRAY },
    };
  }
  return {
    kind,
    tiltDeg: STAMP_ENOUGH_TILT_DEG,
    border: STAMP_TEAL,
    fill: "#ffffff",
    line1: goingLine,
    line2: null,
  };
}

/**
 * OG / clipboard body. English. Omit Out when out=0. Include imbalance
 * when present. First invite (no RSVPs) stays when/where only.
 */
export function pulseBody(input: {
  going: number;
  out: number;
  imbalance: string | null;
  whenWhere: string;
  whenLine?: string;
}) {
  const when =
    (input.whenLine ?? formatWhenWhereLine(input.whenWhere)).trim() || "TBD";
  if (input.going === 0 && input.out === 0) {
    return when;
  }
  const parts = [`${input.going} Going`];
  if (input.out > 0) parts.push(`${input.out} Out`);
  if (input.imbalance) parts.push(input.imbalance);
  if (when) parts.push(when);
  return parts.join(" · ");
}

export function matchdaySharePulse(matchday: SharePulseInput) {
  const going = matchday.rsvps.filter((rsvp) => rsvp.status === "GOING");
  const out = matchday.rsvps.filter((rsvp) => rsvp.status === "OUT").length;
  const positions = parsePositions(matchday.positions);
  const capacity = squadCapacity(matchday.sport, matchday.formation);
  const imbalance = describeImbalance(going, positions, matchday.sport);
  return {
    title: signupTitle(matchday.title),
    body: pulseBody({
      going: going.length,
      out,
      imbalance,
      whenWhere: matchday.whenWhere,
      whenLine: matchdayWhenWhereLine(matchday).text,
    }),
    stamp: stampView(going.length, out, capacity),
    going: going.length,
    out,
    capacity,
    imbalance,
  };
}

export function nextOgBust() {
  return Date.now().toString();
}

export function inviteShareUrl(origin: string, publicId: string) {
  return `${origin.replace(/\/$/, "")}/m/${publicId}`;
}

export function ogImageUrl(publicId: string, ogBust: string) {
  return `/m/${publicId}/opengraph-image?v=${encodeURIComponent(ogBust)}`;
}
