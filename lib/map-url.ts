const MAP_TRUNCATE_HEAD = 30;

export function parseMapUrl(raw: string) {
  const value = raw.trim();
  if (!value) return { ok: true as const, url: null };
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false as const, error: "Map/link must be a plain http(s) URL." };
    }
    return { ok: true as const, url: value };
  } catch {
    return { ok: false as const, error: "Map/link must be a plain http(s) URL." };
  }
}

/** Truncate for the player card — e.g. https://maps.app.goo.gl/yvCNh8… */
export function truncateMapUrl(url: string, head = MAP_TRUNCATE_HEAD) {
  const value = url.trim();
  if (value.length <= head) return value;
  return `${value.slice(0, head)}…`;
}
