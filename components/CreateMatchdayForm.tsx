"use client";

import { useActionState } from "react";
import { createMatchday, type CreateMatchdayState } from "@/app/actions/matchday";

export function CreateMatchdayForm() {
  const [state, action, pending] = useActionState<
    CreateMatchdayState,
    FormData
  >(createMatchday, null);

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
        Title
        <input
          name="title"
          required
          minLength={2}
          maxLength={80}
          placeholder="Sunday kickabout"
          className="min-h-14 rounded-2xl border border-ink/10 bg-white px-4 text-lg text-ink outline-none ring-cobalt/30 placeholder:text-ink/30 focus:ring-4"
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
          className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-lg text-ink outline-none ring-cobalt/30 placeholder:text-ink/30 focus:ring-4"
        />
      </label>
      {state?.error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-14 rounded-full bg-cobalt px-6 text-base font-semibold text-cream transition hover:bg-cobalt-deep disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create matchday"}
      </button>
    </form>
  );
}
