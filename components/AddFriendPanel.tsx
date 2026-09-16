"use client";

import { useActionState, useEffect, useState } from "react";
import {
  addFriendRsvp,
  deleteFriendRsvp,
  updateFriendRsvp,
  type RsvpState,
} from "@/app/actions/rsvp";
import { FatChoice } from "@/components/GuestRsvpForm";
import type { Position } from "@/lib/positions";

export type ExtraRsvp = {
  id: string;
  name: string;
  status: "GOING" | "OUT";
  positionKey: string | null;
};

export function AddFriendPanel({
  publicId,
  positions,
  extras,
}: {
  publicId: string;
  positions: Position[];
  extras: ExtraRsvp[];
}) {
  return (
    <section className="flex flex-col gap-6" data-testid="add-friend">
      <h2 className="font-display text-2xl tracking-tight">Add a friend</h2>
      <p className="text-sm text-ink-soft">
        Same link. They’re listed as added by you.
      </p>
      <FriendForm
        key={extras.length}
        publicId={publicId}
        positions={positions}
        action={addFriendRsvp}
        submitLabel="Add"
        pendingLabel="Adding…"
        testId="friend-submit"
        nameLabel="Friend's name"
      />
      {extras.length > 0 ? (
        <ul className="divide-y divide-ink/10" data-testid="my-extras">
          {extras.map((extra) => (
            <ExtraRow
              key={extra.id}
              extra={extra}
              publicId={publicId}
              positions={positions}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ExtraRow({
  extra,
  publicId,
  positions,
}: {
  extra: ExtraRsvp;
  publicId: string;
  positions: Position[];
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="py-4" data-testid={`extra-${extra.id}`}>
        <FriendForm
          publicId={publicId}
          positions={positions}
          action={updateFriendRsvp}
          extraId={extra.id}
          defaults={extra}
          submitLabel="Save"
          pendingLabel="Saving…"
          testId={`extra-save-${extra.id}`}
          nameLabel="Name"
          onDone={() => setEditing(false)}
        />
        <button
          type="button"
          className="mt-3 text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </li>
    );
  }
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-3 py-4"
      data-testid={`extra-${extra.id}`}
    >
      <div>
        <p className="text-lg font-medium">{extra.name}</p>
        <p className="text-sm text-ink-soft">
          {extra.status === "GOING"
            ? extra.positionKey === "ANY" || !extra.positionKey
              ? "Going · Any"
              : `Going · ${extra.positionKey}`
            : "Out"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid={`extra-edit-${extra.id}`}
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
        <form
          action={deleteFriendRsvp}
          onSubmit={(event) => {
            if (!confirm(`Remove ${extra.name} from this matchday?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="publicId" value={publicId} />
          <input type="hidden" name="extraId" value={extra.id} />
          <button
            type="submit"
            data-testid={`extra-delete-${extra.id}`}
            className="text-sm font-medium text-danger underline-offset-4 hover:underline"
          >
            Delete
          </button>
        </form>
      </div>
    </li>
  );
}

function FriendForm({
  publicId,
  positions,
  action,
  extraId,
  defaults,
  submitLabel,
  pendingLabel,
  testId,
  nameLabel,
  onDone,
}: {
  publicId: string;
  positions: Position[];
  action: (
    prev: RsvpState,
    formData: FormData,
  ) => Promise<NonNullable<RsvpState>>;
  extraId?: string;
  defaults?: ExtraRsvp;
  submitLabel: string;
  pendingLabel: string;
  testId: string;
  nameLabel: string;
  onDone?: () => void;
}) {
  const [status, setStatus] = useState<"GOING" | "OUT">(
    defaults?.status ?? "GOING",
  );
  const [position, setPosition] = useState(defaults?.positionKey ?? "");
  const [state, formAction, pending] = useActionState<RsvpState, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) onDone?.();
    // Intentionally only when the action succeeds.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone is a setState wrapper
  }, [state?.ok]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="publicId" value={publicId} />
      {extraId ? <input type="hidden" name="extraId" value={extraId} /> : null}
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="position" value={position} />
      <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
        {nameLabel}
        <input
          name="name"
          required
          maxLength={40}
          defaultValue={defaults?.name}
          placeholder="Bee"
          data-testid={extraId ? "extra-name" : "friend-name"}
          className="min-h-12 rounded-2xl border border-ink/10 bg-surface px-4 text-lg text-ink outline-none ring-accent/30 placeholder:text-ink/30 focus:ring-4"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <FatChoice
          selected={status === "GOING"}
          onClick={() => setStatus("GOING")}
          testId={`${testId}-going`}
        >
          Going
        </FatChoice>
        <FatChoice
          selected={status === "OUT"}
          onClick={() => setStatus("OUT")}
          testId={`${testId}-out`}
        >
          Out
        </FatChoice>
      </div>
      {status === "GOING" ? (
        <div className="flex flex-wrap gap-3">
          {positions.map((item) => (
            <FatChoice
              key={item.key}
              selected={position === item.key}
              onClick={() => setPosition(item.key)}
              testId={`${testId}-position-${item.key}`}
            >
              {item.label}
            </FatChoice>
          ))}
        </div>
      ) : null}
      {state?.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && !onDone ? (
        <p className="text-sm font-medium text-accent-deep">Added.</p>
      ) : null}
      <button
        type="submit"
        data-testid={testId}
        disabled={pending}
        className="min-h-12 rounded-full bg-accent px-6 text-sm font-semibold text-on-accent transition hover:bg-accent-deep disabled:opacity-60"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
