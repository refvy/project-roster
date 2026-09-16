"use client";

import { useActionState, useState } from "react";
import {
  type MatchdayFormState,
} from "@/app/actions/matchday";
import {
  FOOTBALL_FORMATIONS,
  parseFormation,
  type FormationId,
} from "@/lib/pitch";
import { BasketballMark, FootballMark } from "@/components/SportMarks";
import { SPORTS, type SportId } from "@/lib/positions";

type Defaults = {
  id?: string;
  title?: string;
  whenWhere?: string;
  sport?: SportId;
  formation?: FormationId;
};

export function MatchdayForm({
  action,
  submitLabel,
  pendingLabel,
  defaults,
  includeFormation = false,
}: {
  action: (
    prev: MatchdayFormState,
    formData: FormData,
  ) => Promise<NonNullable<MatchdayFormState>>;
  submitLabel: string;
  pendingLabel: string;
  defaults?: Defaults;
  includeFormation?: boolean;
}) {
  const [sport, setSport] = useState<SportId>(defaults?.sport ?? "football");
  const [formation, setFormation] = useState<FormationId>(
    parseFormation(defaults?.formation),
  );
  const [state, formAction, pending] = useActionState<
    MatchdayFormState,
    FormData
  >(action, null);
  const showFormation = includeFormation && sport === "football";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {defaults?.id ? (
        <input type="hidden" name="id" value={defaults.id} />
      ) : null}
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="formation" value={formation} />
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
              className={`inline-flex min-h-14 min-w-[8.5rem] items-center justify-center gap-2.5 rounded-full border-2 px-5 text-lg font-semibold tracking-wide transition ${
                sport === item.id
                  ? "border-accent bg-accent text-on-accent"
                  : "border-ink/15 bg-surface text-ink hover:border-accent/40"
              }`}
            >
              {item.id === "football" ? (
                <FootballMark
                  className={`h-6 w-6 ${sport === item.id ? "" : "text-accent"}`}
                />
              ) : (
                <BasketballMark
                  className={`h-6 w-6 ${sport === item.id ? "" : "text-accent"}`}
                />
              )}
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>
      {showFormation ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-ink-soft">
            Formation
          </legend>
          <div className="flex flex-wrap gap-2">
            {FOOTBALL_FORMATIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`edit-formation-${item.id}`}
                aria-pressed={formation === item.id}
                onClick={() => setFormation(item.id)}
                className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-semibold tracking-wide transition ${
                  formation === item.id
                    ? "border-accent bg-accent text-on-accent"
                    : "border-ink/15 bg-surface text-ink hover:border-accent/40"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
        Title
        <input
          name="title"
          required
          minLength={2}
          maxLength={80}
          defaultValue={defaults?.title}
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
          defaultValue={defaults?.whenWhere}
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
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
