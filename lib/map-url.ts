const MAP_TRUNCATE_MAX = 28;

export function parseMapUrl(raw: string) {
  const value = raw.trim();
  if (!value) return { ok: true as const, url: null };
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      return { ok: false as const, error: "Map/link must be a plain https URL." };
    }
    return { ok: true as const, url: value };
  } catch {
    return { ok: false as const, error: "Map/link must be a plain https URL." };
  }
}

/** One-line card/chip label: domain + path, ellipsis if long. */
export function truncateMapUrl(url: string, max = MAP_TRUNCATE_MAX) {
  const value = url.trim();
  let display = value;
  try {
    const parsed = new URL(value);
    display = `${parsed.host}${parsed.pathname}${parsed.search}`.replace(
      /\/$/,
      "",
    );
  } catch {
    display = value.replace(/^https?:\/\//, "");
  }
  if (display.length <= max) return display;
  return `${display.slice(0, max)}…`;
}
