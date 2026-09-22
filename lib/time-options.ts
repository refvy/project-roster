export const HOURS_24 = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);

export const MINUTE_STEPS = ["00", "15", "30", "45"] as const;

export type MinuteStep = (typeof MINUTE_STEPS)[number];

export function isQuarterTime(time: string) {
  return /^\d{2}:(00|15|30|45)$/.test(time);
}

export function snapToQuarter(time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) return "";
  if (isQuarterTime(time)) return time;
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const snapped = Math.round(minute / 15) * 15;
  if (snapped === 60) {
    return `${String((hour + 1) % 24).padStart(2, "0")}:00`;
  }
  return `${String(hour).padStart(2, "0")}:${String(snapped).padStart(2, "0")}`;
}

export function addOneHour(time: string): { time: string; nextDay: boolean } {
  if (!isQuarterTime(time)) {
    return { time: "18:00", nextDay: false };
  }
  const [hourRaw, minuteRaw] = time.split(":");
  const total = Number(hourRaw) * 60 + Number(minuteRaw) + 60;
  const nextDay = total >= 24 * 60;
  const wrapped = total % (24 * 60);
  const hour = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const minute = String(wrapped % 60).padStart(2, "0");
  return { time: `${hour}:${minute}`, nextDay };
}

export function addCalendarDays(date: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function splitTime(time: string) {
  const [hour = "18", minute = "00"] = time.split(":");
  return { hour, minute };
}

export function joinTime(hour: string, minute: string) {
  return `${hour}:${minute}`;
}
