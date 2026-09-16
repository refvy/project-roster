"use client";

import { useActionState, useState } from "react";
import { createMatchday, type CreateMatchdayState } from "@/app/actions/matchday";
import { SPORTS, type SportId } from "@/lib/positions";

export function CreateMatchdayForm() {
  const [sport, setSport] = useState<SportId>("football");
  const [state, action, pending] = useActionState<
    CreateMatchdayState,
    FormData
  >(createMatchday, null);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="sport" value={sport} />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-ink-soft">Sport</legend>
        <div className="flex flex-wrap gap-3">
          {SPORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`sport-${item.id}`}
              aria-pressed={sport === item.id}
              onClick={() => setSport(item.id)}
              className={`inline-flex min-h-14 min-w-[7rem] items-center justify-center rounded-full border-2 px-6 text-lg font-semibold tracking-wide transition ${
                sport === item.id
                  ? "border-accent bg-accent text-on-accent"
                  : "border-ink/15 bg-surface text-ink hover:border-accent/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
        Title
        <input
          name="title"
          required
          minLength={2}
          maxLength={80}
          placeholder="Sunday kickabout"
          className="min-h-14 rounded-2xl border border-ink/10 bg-surface px-4 text-lg text-ink outline-none ring-accent/30 placeholder:text-ink/30 focus:ring-4"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
        When / where
        <textarea
          name="whenWhere"
          required
          minLength={2}
          maxLength={200}
          rows={3}
          placeholder="Sun 17:00 · Lumphini pitch 2"
          className="rounded-2xl border border-ink/10 bg-surface px-4 py-3 text-lg text-ink outline-none ring-accent/30 placeholder:text-ink/30 focus:ring-4"
        />
      </label>
      {state?.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-14 rounded-full bg-accent px-6 text-base font-semibold text-on-accent transition hover:bg-accent-deep disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create matchday"}
      </button>
    </form>
  );
}
