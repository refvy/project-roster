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
  LINEUP_FORMATION_CHIPS,
  assignToSlot,
  clearLineupSlots,
  hydrateEditorSlots,
  isNewToOtherLineups,
  parseLineupFormation,
  poolForEditor,
  positionHint,
  sortPickerPeople,
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
  otherAssignedIds = [],
  otherSavedCount = 0,
  onClose,
}: {
  open: boolean;
  matchdayId: string;
  going: LineupGoing[];
  draft: LineupDraft;
  otherAssignedIds?: string[];
  otherSavedCount?: number;
  onClose: () => void;
}) {
  const [name, setName] = useState(draft.name);
  const [formation, setFormation] = useState<LineupFormationId>(draft.formation);
  const [slots, setSlots] = useState<LineupSlotSnap[]>(draft.slots);
  const [picking, setPicking] = useState<LineupSlotSnap | null>(null);
  const [query, setQuery] = useState("");
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
    setPicking(null);
    setQuery("");
    // Hydrate once when the sheet opens — live Going refreshes must not wipe taps.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- going is the open-time pool
  }, [open, draft]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (picking) {
        setPicking(null);
        return;
      }
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, picking]);

  useEffect(() => {
    if (createState && !createState.error) onClose();
  }, [createState, onClose]);

  useEffect(() => {
    if (updateState && !updateState.error) onClose();
  }, [updateState, onClose]);

  if (!open) return null;

  const pending = creating || updating;
  const error = draft.id ? updateState?.error : createState?.error;
  const action = draft.id ? updateAction : createAction;
  const pool = poolForEditor(going, slots);
  const needle = query.trim().toLowerCase();
  const usedElsewhere = new Set(otherAssignedIds);
  const pickerPeople = sortPickerPeople(
    pool.filter((person) =>
      needle ? person.name.toLowerCase().includes(needle) : true,
    ),
    usedElsewhere,
    otherSavedCount,
  );

  function changeFormation(next: LineupFormationId) {
    if (next === formation) return;
    setFormation(next);
    setSlots(clearLineupSlots(next));
    setPicking(null);
    setQuery("");
  }

  function choosePerson(person: LineupGoing | null) {
    if (!picking) return;
    setSlots((current) => assignToSlot(current, picking.id, person));
    setPicking(null);
    setQuery("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lineup"
        data-testid="lineup-editor"
        className="relative flex h-full w-full max-w-3xl flex-col bg-surface shadow-banner"
      >
        <header className="flex shrink-0 items-center gap-2 px-4 pb-1.5 pt-3 sm:px-5">
          <label className="sr-only" htmlFor="lineup-name">
            Lineup name
          </label>
          <input
            id="lineup-name"
            data-testid="lineup-name"
            value={name}
            maxLength={20}
            placeholder="e.g. Q1"
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-2xl border border-ink/10 bg-surface px-4 text-lg text-ink outline-none ring-accent/30 placeholder:text-ink/30 focus:ring-4"
          />
          <button
            type="button"
            data-testid="lineup-close"
            aria-label="Close"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center text-2xl leading-none text-ink-soft"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-5">
          <div className="flex shrink-0 flex-wrap gap-1.5 pb-2">
            {LINEUP_FORMATION_CHIPS.map((id) => (
              <button
                key={id}
                type="button"
                data-testid={`lineup-formation-${id}`}
                aria-pressed={formation === id}
                onClick={() => changeFormation(id)}
                className={`inline-flex min-h-9 items-center rounded-full border-2 px-3 text-sm font-semibold tracking-wide transition ${
                  formation === id
                    ? "border-accent bg-accent text-on-accent"
                    : "border-ink/15 bg-surface text-ink hover:border-accent/40"
                }`}
              >
                {id}
              </button>
            ))}
          </div>

          <div
            className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
            style={{ containerType: "size" }}
          >
            <LineupPitch
              fit
              formation={formation}
              slots={slots}
              selectedSlotId={picking?.id ?? null}
              onSlot={(slotId) => {
                const slot = slots.find((row) => row.id === slotId);
                if (!slot) return;
                setQuery("");
                setPicking(slot);
              }}
            />
          </div>
          {error ? (
            <p className="shrink-0 pb-2 text-sm font-medium text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <form
          action={action}
          data-testid="lineup-editor-footer"
          className="flex shrink-0 flex-wrap items-center gap-4 border-t border-ink/10 px-4 py-3 sm:px-5"
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

        {picking ? (
          <div className="absolute inset-0 z-20 flex items-end justify-center sm:items-center">
            <button
              type="button"
              aria-label="Close picker"
              className="absolute inset-0 bg-ink/40"
              onClick={() => {
                setPicking(null);
                setQuery("");
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="lineup-picker-title"
              data-testid="lineup-picker"
              className="relative z-10 max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface px-5 py-5 shadow-banner sm:rounded-3xl"
            >
              <h4
                id="lineup-picker-title"
                className="font-display text-2xl tracking-tight"
              >
                Add player · {picking.key}
              </h4>
              <input
                data-testid="lineup-picker-search"
                value={query}
                placeholder="Search players"
                onChange={(event) => setQuery(event.target.value)}
                className="mt-4 min-h-12 w-full rounded-2xl border border-ink/10 bg-surface px-4 text-base text-ink outline-none ring-accent/30 placeholder:text-ink/30 focus:ring-4"
              />
              <ul className="mt-4 flex flex-col gap-1">
                {picking.rsvpId ? (
                  <li>
                    <button
                      type="button"
                      data-testid="lineup-picker-clear"
                      onClick={() => choosePerson(null)}
                      className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-2 text-left hover:bg-cream"
                    >
                      <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border-2 border-ink/25 bg-surface" />
                      <span className="text-sm font-medium text-ink-soft">
                        Clear slot
                      </span>
                    </button>
                  </li>
                ) : null}
                {pickerPeople.length === 0 ? (
                  <li className="px-2 py-3 text-sm text-ink-soft">
                    {going.length === 0
                      ? "Waiting on the first Going."
                      : needle
                        ? "No names match."
                        : "Everyone is on the pitch."}
                  </li>
                ) : (
                  pickerPeople.map((person) => {
                    const isNew = isNewToOtherLineups(
                      person.id,
                      usedElsewhere,
                      otherSavedCount,
                    );
                    return (
                      <li key={person.id}>
                        <button
                          type="button"
                          data-testid="lineup-picker-person"
                          data-name={person.name}
                          data-new={isNew ? "true" : "false"}
                          onClick={() => choosePerson(person)}
                          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl px-2 text-left hover:bg-cream"
                        >
                          <span className="flex items-center gap-2">
                            <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border-2 border-ink/25 bg-surface" />
                            <span className="text-sm font-medium">
                              {person.name}
                            </span>
                            {isNew ? (
                              <span
                                data-testid="lineup-picker-new"
                                className="text-[11px] font-medium text-ink/40"
                              >
                                New
                              </span>
                            ) : null}
                          </span>
                          <span
                            className="text-[12px] leading-none"
                            style={{ color: "#9CA3AF" }}
                          >
                            {positionHint(person.positionKey)}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        ) : null}
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
