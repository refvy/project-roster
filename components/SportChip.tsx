import { sportLabel } from "@/lib/positions";

export function SportChip({
  sport,
  testId = "sport-chip",
}: {
  sport: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold tracking-wide text-accent-deep"
    >
      {sportLabel(sport)}
    </span>
  );
}
