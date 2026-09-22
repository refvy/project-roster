function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildMatchdayIcs(input: {
  publicId: string;
  title: string;
  place?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  url: string;
}) {
  const now = icsUtc(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Skwad//Matchday//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.publicId}@getskwad.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${icsUtc(input.startsAt)}`,
  ];
  if (input.endsAt) {
    lines.push(`DTEND:${icsUtc(input.endsAt)}`);
  }
  lines.push(`SUMMARY:${icsEscape(input.title)}`);
  if (input.place?.trim()) {
    lines.push(`LOCATION:${icsEscape(input.place.trim())}`);
  }
  lines.push(`URL:${icsEscape(input.url)}`);
  lines.push(`DESCRIPTION:${icsEscape(input.url)}`);
  lines.push("END:VEVENT", "END:VCALENDAR", "");
  return lines.join("\r\n");
}
