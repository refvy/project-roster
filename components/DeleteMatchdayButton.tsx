"use client";

import { deleteMatchday } from "@/app/actions/matchday";

export function DeleteMatchdayButton({ matchdayId }: { matchdayId: string }) {
  return (
    <form
      action={deleteMatchday}
      onSubmit={(event) => {
        if (
          !confirm(
            "Delete this matchday? Guests with the link will see it as gone.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={matchdayId} />
      <button
        type="submit"
        data-testid="delete-matchday"
        className="text-sm font-medium text-danger underline-offset-4 hover:underline"
      >
        Delete
      </button>
    </form>
  );
}
