"use client";

import { useActionState } from "react";
import { requestMagicLink, type MagicLinkState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<
    MagicLinkState,
    FormData
  >(requestMagicLink, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@club.example"
          className="min-h-14 rounded-2xl border border-ink/10 bg-white px-4 text-lg text-ink outline-none ring-cobalt/30 placeholder:text-ink/30 focus:ring-4"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-14 rounded-full bg-cobalt px-6 text-base font-semibold text-cream transition hover:bg-cobalt-deep disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a magic link"}
      </button>
      {state?.error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && state.debugUrl ? (
        <p className="rounded-2xl bg-cobalt-soft px-4 py-3 text-sm text-cobalt-deep">
          AUTH_DEBUG is on.{" "}
          <a
            data-testid="debug-magic-link"
            href={state.debugUrl}
            className="font-semibold underline decoration-2 underline-offset-4"
          >
            Open magic link
          </a>
        </p>
      ) : null}
      {state?.ok && !state.debugUrl ? (
        <p className="text-sm text-ink-soft">
          Link issued. {state.hint ?? "Check AUTH_DEBUG if you expected it on screen."}
        </p>
      ) : null}
    </form>
  );
}
