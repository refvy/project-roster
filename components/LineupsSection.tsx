"use client";

import { useMemo, useState } from "react";
import { LineupEditor, startDraft, type LineupDraft } from "@/components/LineupEditor";
import { LineupPitch } from "@/components/LineupPitch";
import {
  LINEUP_CAP,
  otherLineupCount,
  parseLineupBench,
  parseLineupFormation,
  parseLineupSlots,
  suggestedLineupName,
  usedRsvpIdsElsewhere,
  type LineupGoing,
} from "@/lib/lineup";

export type SavedLineup = {
  id: string;
  name: string;
  formation: string;
  slots: unknown;
  bench: unknown;
};

export function LineupsSection({
  matchdayId,
  going,
  lineups,
  canEdit,
}: {
  matchdayId: string;
  going: LineupGoing[];
  lineups: SavedLineup[];
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState<LineupDraft | null>(null);
  const existingNames = useMemo(
    () => lineups.map((row) => row.name),
    [lineups],
  );

  if (!canEdit && lineups.length === 0) return null;

  function openCreate() {
    setDraft(startDraft(existingNames, suggestedLineupName));
  }

  function openEdit(row: SavedLineup) {
    setDraft({
      id: row.id,
      name: row.name,
      formation: parseLineupFormation(row.formation),
      slots: parseLineupSlots(row.slots),
    });
  }

  return (
    <section data-testid="lineups">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight">Lineups</h2>
        {canEdit && lineups.length < LINEUP_CAP ? (
          <button
            type="button"
            data-testid="create-lineup"
            onClick={openCreate}
            className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            + Create lineup
          </button>
        ) : null}
      </div>

      {lineups.length > 0 ? (
        <div
          data-testid="lineup-carousel"
          className="-mx-6 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        >
          {lineups.map((row) => {
            const slots = parseLineupSlots(row.slots);
            const bench = parseLineupBench(row.bench);
            return (
              <article
                key={row.id}
                data-testid="lineup-card"
                data-name={row.name}
                className="w-[80%] max-w-sm shrink-0 snap-start rounded-3xl bg-cream p-3 ring-1 ring-accent/30 first:ml-5 last:mr-5"
              >
                <button
                  type="button"
                  data-testid="lineup-card-open"
                  onClick={() => (canEdit ? openEdit(row) : undefined)}
                  className="w-full text-left"
                >
                  <p
                    data-testid="lineup-card-title"
                    className="text-sm font-semibold text-ink"
                  >
                    {row.name} — {parseLineupFormation(row.formation)}
                  </p>
                  <div className="mt-2">
                    <LineupPitch
                      formation={row.formation}
                      slots={slots}
                      compact
                      testId={`lineup-card-pitch-${row.id}`}
                    />
                  </div>
                </button>
                <div className="mt-3" data-testid="lineup-card-bench">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
                    Bench
                  </p>
                  {bench.length === 0 ? (
                    <p className="mt-1 text-sm text-ink-soft">Nobody on the bench.</p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {bench.map((person) => (
                        <li
                          key={`${person.rsvpId}-${person.name}`}
                          className="rounded-full bg-surface px-2.5 py-1 text-sm ring-1 ring-ink/10"
                        >
                          {person.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {draft ? (
        <LineupEditor
          open
          matchdayId={matchdayId}
          going={going}
          draft={draft}
          otherAssignedIds={[
            ...usedRsvpIdsElsewhere(lineups, draft.id),
          ]}
          otherSavedCount={otherLineupCount(lineups, draft.id)}
          onClose={() => setDraft(null)}
        />
      ) : null}
    </section>
  );
}
