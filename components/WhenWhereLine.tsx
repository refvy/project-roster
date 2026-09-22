import { matchdayWhenWhereLine } from "@/lib/when-where";

export function WhenWhereLine({
  whenWhere,
  startsAt,
  endsAt,
  hasTime,
  place,
  venue,
  going,
  className,
  testId = "when-where",
}: {
  whenWhere: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  hasTime?: boolean | null;
  place?: string | null;
  venue?: string | null;
  going?: number;
  className?: string;
  testId?: string;
}) {
  const { text: line, tbd } = matchdayWhenWhereLine({
    startsAt,
    endsAt,
    hasTime,
    place,
    venue,
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
