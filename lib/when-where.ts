export const MATCHDAY_TZ = "Asia/Bangkok";

export type WhenWhereFields = {
  startsAt?: Date | null;
  endsAt?: Date | null;
  hasTime?: boolean | null;
  place?: string | null;
  venue?: string | null;
  mapUrl?: string | null;
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

export function bangkokTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MATCHDAY_TZ,
  }).format(new Date());
}

function bangkokWhenParts(utc: Date) {
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
  return {
    date: `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

export function formatBangkokDate(utc: Date) {
  return bangkokWhenParts(utc).date;
}

/** Compact summary: `Sun 28 Sep` (no year). */
export function formatBangkokDateCompact(utc: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MATCHDAY_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(utc);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")}`;
}

export function formatWhenSummary(date: string, start: string, end: string) {
  if (!date) return "";
  const utc = bangkokDateTimeToUtc(date, start || "12:00");
  if (!utc) return "";
  const compact = formatBangkokDateCompact(utc);
  if (!start) return compact;
  if (end) return `${compact} · ${start}–${end}`;
  return `${compact} · ${start}`;
}

export function formatBangkokWhen(utc: Date, endsAt?: Date | null) {
  const { date, time } = bangkokWhenParts(utc);
  if (endsAt) {
    return `${date} · ${time}–${bangkokWhenParts(endsAt).time}`;
  }
  return `${date} · ${time}`;
}

export function hasStructuredStart(fields: WhenWhereFields) {
  return Boolean(fields.startsAt);
}

export function displayVenueName(fields: WhenWhereFields) {
  return (fields.venue ?? fields.place)?.trim() ?? "";
}

export function displayWhen(fields: WhenWhereFields): DisplayBit {
  if (fields.startsAt) {
    if (fields.hasTime === false) {
      return { text: formatBangkokDate(fields.startsAt), tbd: false };
    }
    return {
      text: formatBangkokWhen(fields.startsAt, fields.endsAt),
      tbd: false,
    };
  }
  const fallback = formatWhenWhereLine(fields.whenWhere);
  if (fallback) return { text: fallback, tbd: false };
  return { text: "TBD", tbd: true };
}

export function displayWhere(fields: WhenWhereFields): DisplayBit {
  const venue = displayVenueName(fields);
  if (venue) return { text: venue, tbd: false };
  return { text: "TBD", tbd: true };
}

/**
 * Prefer structured date + venue; else free-text whenWhere; else TBD.
 */
export function matchdayWhenWhereLine(fields: WhenWhereFields): DisplayBit {
  const when = displayWhen(fields);
  const venue = displayVenueName(fields);
  if (fields.startsAt) {
    return {
      text: venue ? `${when.text} · ${venue}` : when.text,
      tbd: false,
    };
  }
  if (!when.tbd) return when;
  if (venue) return { text: venue, tbd: false };
  return { text: "TBD", tbd: true };
}

export function shouldCollapseWhenWhere(fields: WhenWhereFields) {
  const structured = Boolean(fields.startsAt) || Boolean(displayVenueName(fields));
  return structured && Boolean(formatWhenWhereLine(fields.whenWhere));
}

const DETAILS_PREVIEW_LINES = 3;

/** Trimmed Details notes, split on newlines (empty lines count). */
export function detailsLines(value: string) {
  const trimmed = value.replace(/^\s+|\s+$/g, "");
  if (!trimmed) return [];
  return trimmed.split(/\r?\n/);
}

export function detailsPreview(value: string, maxLines = DETAILS_PREVIEW_LINES) {
  const lines = detailsLines(value);
  return {
    text: lines.join("\n"),
    preview: lines.slice(0, maxLines).join("\n"),
    overflow: lines.length > maxLines,
  };
}
