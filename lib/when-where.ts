/** Collapse organiser when/where (textarea) to a single display line. */
export function formatWhenWhereLine(value: string) {
  return value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}
