"use client";

import { useActionState, useState } from "react";
import { submitRsvp, type RsvpState } from "@/app/actions/rsvp";
import type { Position } from "@/lib/positions";

type Props = {
  publicId: string;
  positions: Position[];
  defaultName: string;
  defaultStatus: "GOING" | "OUT";
  defaultPosition: string | null;
  confirmed?: boolean;
};

export function GuestRsvpForm({
  publicId,
  positions,
  defaultName,
  defaultStatus,
  defaultPosition,
  confirmed,
}: Props) {
  const [status, setStatus] = useState<"GOING" | "OUT">(defaultStatus);
  const [position, setPosition] = useState(defaultPosition ?? "");
  const [state, action, pending] = useActionState<RsvpState, FormData>(
    submitRsvp,
    confirmed ? { ok: true } : null,
  );

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="publicId" value={publicId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="position" value={position} />

      <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
        Your name
        <input
          name="name"
          required
          maxLength={40}
          defaultValue={defaultName}
          autoComplete="name"
          placeholder="Nok"
          className="min-h-14 rounded-2xl border border-ink/10 bg-white px-4 text-lg text-ink outline-none ring-cobalt/30 placeholder:text-ink/30 focus:ring-4"
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink-soft">In or out</legend>
        <div className="flex flex-wrap gap-3">
          <FatChoice
            selected={status === "GOING"}
            onClick={() => setStatus("GOING")}
            testId="status-going"
          >
            Going
          </FatChoice>
          <FatChoice
            selected={status === "OUT"}
            onClick={() => setStatus("OUT")}
            testId="status-out"
          >
            Out
          </FatChoice>
        </div>
      </fieldset>

      {status === "GOING" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium text-ink-soft">
            Position
          </legend>
          <div className="flex flex-wrap gap-3">
            {positions.map((item) => (
              <FatChoice
                key={item.key}
                selected={position === item.key}
                onClick={() => setPosition(item.key)}
                testId={`position-${item.key}`}
              >
                {item.label}
              </FatChoice>
            ))}
          </div>
        </fieldset>
      ) : null}

      {state?.error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p
          data-testid="rsvp-confirmed"
          className="rounded-2xl bg-cobalt-soft px-4 py-3 text-sm font-medium text-cobalt-deep"
        >
          {status === "GOING"
            ? `You're going${position ? ` · ${position}` : ""}.`
            : "You're out."}
        </p>
      ) : null}

      <button
        type="submit"
        data-testid="rsvp-submit"
        disabled={pending}
        className="min-h-16 rounded-full bg-cobalt px-8 text-lg font-semibold text-cream transition hover:bg-cobalt-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : "Done"}
      </button>
    </form>
  );
}

function FatChoice({
  selected,
  onClick,
  children,
  testId,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-14 min-w-[4.5rem] items-center justify-center rounded-full border-2 px-6 text-lg font-semibold tracking-wide transition ${
        selected
          ? "border-cobalt bg-cobalt text-cream"
          : "border-ink/15 bg-white text-ink hover:border-cobalt/40"
      }`}
    >
      {children}
    </button>
  );
}
