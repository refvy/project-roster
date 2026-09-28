"use client";

import { useEffect, useState } from "react";
import { athleteFirstNames } from "@/lib/athlete-names";

export function AthleteNameInput({
  sport,
  label,
  defaultValue,
  testId,
  className = "min-h-14 rounded-2xl border border-ink/10 bg-surface px-4 text-lg text-ink outline-none ring-accent/30 placeholder:text-ink/30 focus:ring-4",
}: {
  sport: string;
  label: string;
  defaultValue?: string;
  testId?: string;
  className?: string;
}) {
  const names = athleteFirstNames(sport);
  const [placeholder, setPlaceholder] = useState(names[0]!);

  useEffect(() => {
    const index = Math.floor(Math.random() * names.length);
    setPlaceholder(names[index]!);
  }, [names]);

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
      {label}
      <input
        name="name"
        required
        maxLength={40}
        defaultValue={defaultValue}
        autoComplete="name"
        placeholder={placeholder}
        data-testid={testId}
        className={className}
      />
    </label>
  );
}
