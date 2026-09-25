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
          className="min-h-14 rounded-2xl border border-ink/10 bg-surface px-4 text-lg text-ink outline-none ring-accent/30 placeholder:text-ink/30 focus:ring-4"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-14 rounded-full bg-accent px-6 text-base font-semibold text-on-accent transition hover:bg-accent-deep disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a magic link"}
      </button>
      {state?.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && state.mailed ? (
        <p data-testid="magic-link-sent" className="text-sm text-ink-soft">
          Check your email for the magic link
        </p>
      ) : null}
      {state?.ok && state.debugUrl ? (
        <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent-deep">
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
    </form>
  );
}
