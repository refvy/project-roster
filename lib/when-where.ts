export const MATCHDAY_TZ = "Asia/Bangkok";

export type WhenWhereFields = {
  startsAt?: Date | null;
  place?: string | null;
  whenWhere: string;
};

export type DisplayBit = {
  text: string;
  tbd: boolean;
};

/** Collapse organiser when/where (textarea) to a single display line. */
export function formatWhenWhereLine(value: string) {
  return value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}

export function bangkokDateTimeToUtc(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }
  const parsed = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function utcToBangkokParts(utc: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MATCHDAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utc);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

export function formatBangkokWhen(utc: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MATCHDAY_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utc);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")} · ${get("hour")}:${get("minute")}`;
}

export function hasStructuredStart(fields: WhenWhereFields) {
  return Boolean(fields.startsAt);
}

export function displayWhen(fields: WhenWhereFields): DisplayBit {
  if (fields.startsAt) {
    return { text: formatBangkokWhen(fields.startsAt), tbd: false };
  }
  const fallback = formatWhenWhereLine(fields.whenWhere);
  if (fallback) return { text: fallback, tbd: false };
  return { text: "TBD", tbd: true };
}

export function displayWhere(fields: WhenWhereFields): DisplayBit {
  const place = fields.place?.trim() ?? "";
  if (place) return { text: place, tbd: false };
  return { text: "TBD", tbd: true };
}

/**
 * Prefer structured date + place; else free-text whenWhere; else TBD.
 */
export function matchdayWhenWhereLine(fields: WhenWhereFields): DisplayBit {
  const when = displayWhen(fields);
  const place = fields.place?.trim() ?? "";
  if (fields.startsAt) {
    return {
      text: place ? `${when.text} · ${place}` : when.text,
      tbd: false,
    };
  }
  if (!when.tbd) return when;
  if (place) return { text: place, tbd: false };
  return { text: "TBD", tbd: true };
}
