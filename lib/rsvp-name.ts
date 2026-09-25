export function normalizePersonName(name: string) {
  return name.trim().toLowerCase();
}

/** First Going name that collides, skipping one occurrence of `ignoreOnce`. */
export function collidingGoingName(
  goingNames: string[],
  candidate: string,
  ignoreOnce?: string | null,
): string | null {
  const needle = normalizePersonName(candidate);
  if (!needle) return null;
  const skip = ignoreOnce ? normalizePersonName(ignoreOnce) : "";
  let skipped = false;
  for (const raw of goingNames) {
    if (normalizePersonName(raw) !== needle) continue;
    if (skip && !skipped && normalizePersonName(raw) === skip) {
      skipped = true;
      continue;
    }
    return raw.trim();
  }
  return null;
}
