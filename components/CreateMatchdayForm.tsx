"use client";

import { createMatchday } from "@/app/actions/matchday";
import { MatchdayForm } from "@/components/MatchdayForm";

export function CreateMatchdayForm() {
  return (
    <MatchdayForm
      action={createMatchday}
      submitLabel="Create matchday"
      pendingLabel="Creating…"
    />
  );
}
