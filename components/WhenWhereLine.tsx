import { matchdayWhenWhereLine } from "@/lib/when-where";

export function WhenWhereLine({
  whenWhere,
  startsAt,
  place,
  going,
  className,
  testId = "when-where",
}: {
  whenWhere: string;
  startsAt?: Date | null;
  place?: string | null;
  going?: number;
  className?: string;
  testId?: string;
}) {
  const { text: line, tbd } = matchdayWhenWhereLine({
    startsAt,
    place,
    whenWhere,
  });
  const text = going == null ? line : `${line} · ${going} going`;
  return (
    <p
      data-testid={testId}
      title={text}
      className={`truncate whitespace-nowrap ${tbd ? "text-ink/40" : ""} ${className ?? ""}`}
    >
      {text}
    </p>
  );
}
