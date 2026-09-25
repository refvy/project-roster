"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createLineup,
  deleteLineup,
  updateLineup,
  type LineupState,
} from "@/app/actions/lineup";
import { LineupPitch } from "@/components/LineupPitch";
import {
  LINEUP_FORMATIONS,
  assignToSlot,
  clearLineupSlots,
  hydrateEditorSlots,
  parseLineupFormation,
  poolForEditor,
  positionHint,
  type LineupFormationId,
  type LineupGoing,
  type LineupSlotSnap,
} from "@/lib/lineup";

export type LineupDraft = {
  id?: string;
  name: string;
  formation: LineupFormationId;
  slots: LineupSlotSnap[];
};

export function LineupEditor({
  open,
  matchdayId,
  going,
  draft,
  onClose,
}: {
  open: boolean;
  matchdayId: string;
  going: LineupGoing[];
  draft: LineupDraft;
  onClose: () => void;
}) {
  const [name, setName] = useState(draft.name);
  const [formation, setFormation] = useState<LineupFormationId>(draft.formation);
  const [slots, setSlots] = useState<LineupSlotSnap[]>(draft.slots);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [createState, createAction, creating] = useActionState<
    LineupState,
    FormData
  >(createLineup, null);
  const [updateState, updateAction, updating] = useActionState<
    LineupState,
    FormData
  >(updateLineup, null);

  useEffect(() => {
    if (!open) return;
    setName(draft.name);
    setFormation(draft.formation);
    setSlots(
      draft.id
        ? hydrateEditorSlots(draft.formation, draft.slots, going)
        : draft.slots,
    );
    setPickedId(null);
    // Hydrate once when the sheet opens — live Going refreshes must not wipe taps.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- going is the open-time pool
  }, [open, draft]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (createState && !createState.error) onClose();
  }, [createState, onClose]);

  useEffect(() => {
    if (updateState && !updateState.error) onClose();
  }, [updateState, onClose]);

  if (!open) return null;

  const pool = poolForEditor(going, slots);
  const picked = going.find((player) => player.id === pickedId) ?? null;
  const pending = creating || updating;
  const error = draft.id ? updateState?.error : createState?.error;
  const action = draft.id ? updateAction : createAction;

  function pickPerson(id: string) {
    setPickedId((current) => (current === id ? null : id));
  }

  function onSlot(slotId: string) {
    const slot = slots.find((row) => row.id === slotId);
    if (slot?.rsvpId && !picked) {
      setSlots((current) => assignToSlot(current, slotId, null));
      return;
    }
    if (picked) {
      setSlots((current) => assignToSlot(current, slotId, picked));
      setPickedId(null);
    }
  }

  function changeFormation(next: LineupFormationId) {
    if (next === formation) return;
    setFormation(next);
    setSlots(clearLineupSlots(next));
    setPickedId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lineup-editor-title"
        data-testid="lineup-editor"
        className="relative flex h-full w-full max-w-3xl flex-col bg-surface shadow-banner"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4">
          <h3
            id="lineup-editor-title"
            className="font-display text-2xl tracking-tight"
          >
            {draft.id ? "Edit lineup" : "Create lineup"}
          </h3>
          <button
            type="button"
            data-testid="lineup-close"
            aria-label="Close"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center text-2xl leading-none text-ink-soft"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-ink-soft">
            Lineup name
            <input
              data-testid="lineup-name"
              value={name}
              maxLength={20}
              placeholder="e.g. Q1"
              onChange={(event) => setName(event.target.value)}
              className="min-h-14 rounded-2xl border border-ink/10 bg-surface px-4 text-lg text-ink outline-none ring-accent/30 placeholder:text-ink/30 focus:ring-4"
            />
          </label>

          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-medium text-ink-soft">
              Formation
            </legend>
            <div className="flex flex-wrap gap-2">
              {LINEUP_FORMATIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`lineup-formation-${item.id}`}
                  aria-pressed={formation === item.id}
                  onClick={() => changeFormation(item.id)}
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

          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-start">
            <div>
              <p className="text-sm font-semibold text-ink-soft">Going</p>
              {pool.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">
                  {going.length === 0
                    ? "Waiting on the first Going."
                    : "Everyone is on the pitch."}
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-1" data-testid="lineup-pool">
                  {pool.map((person) => {
                    const selected = pickedId === person.id;
                    return (
                      <li key={person.id}>
                        <button
                          type="button"
                          data-testid="lineup-pool-person"
                          data-name={person.name}
                          onClick={() => pickPerson(person.id)}
                          className={`flex min-h-11 w-full items-center gap-2 rounded-2xl px-2 text-left ${
                            selected ? "bg-accent-soft" : "hover:bg-cream"
                          }`}
                        >
                          <span
                            className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border-2 ${
                              selected
                                ? "border-accent bg-accent"
                                : "border-ink/25 bg-surface"
                            }`}
                          />
                          <span className="text-sm font-medium">{person.name}</span>
                          <span
                            className="text-[12px] leading-none"
                            style={{ color: "#9CA3AF" }}
                          >
                            {positionHint(person.positionKey)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <LineupPitch
              formation={formation}
              slots={slots}
              onSlot={onSlot}
            />
          </div>
          {error ? (
            <p className="mt-4 text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <form
          action={action}
          className="flex flex-wrap items-center gap-4 border-t border-ink/10 px-5 py-4"
        >
          <input type="hidden" name="matchdayId" value={matchdayId} />
          {draft.id ? <input type="hidden" name="lineupId" value={draft.id} /> : null}
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="formation" value={formation} />
          <input type="hidden" name="slots" value={JSON.stringify(slots)} />
          <button
            type="button"
            data-testid="lineup-cancel"
            onClick={onClose}
            className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          >
            Cancel
          </button>
          {draft.id ? (
            <button
              type="button"
              data-testid="lineup-delete"
              onClick={() => {
                if (!confirm("Delete this lineup?")) return;
                const data = new FormData();
                data.set("matchdayId", matchdayId);
                data.set("lineupId", draft.id!);
                void deleteLineup(data).then(onClose);
              }}
              className="text-sm font-medium text-danger underline-offset-4 hover:underline"
            >
              Delete
            </button>
          ) : null}
          <button
            type="submit"
            data-testid="lineup-save"
            disabled={pending}
            className="ml-auto inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-sm font-semibold text-on-accent hover:bg-accent-deep disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function startDraft(
  goingNames: string[],
  suggest: (names: string[]) => string,
): LineupDraft {
  const formation = parseLineupFormation("4-3-3");
  return {
    name: suggest(goingNames),
    formation,
    slots: clearLineupSlots(formation),
  };
}
