import { formatWhenWhereLine } from "@/lib/when-where";

export function WhenWhereLine({
  value,
  going,
  className,
  testId = "when-where",
}: {
  value: string;
  going?: number;
  className?: string;
  testId?: string;
}) {
  const line = formatWhenWhereLine(value);
  const text = going == null ? line : `${line} · ${going} going`;
  return (
    <p
      data-testid={testId}
      title={text}
      className={`truncate whitespace-nowrap ${className ?? ""}`}
    >
      {text}
    </p>
  );
}
