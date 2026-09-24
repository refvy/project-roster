"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeOrganiserRsvp } from "@/app/actions/rsvp";
import { Sheet } from "@/components/Sheet";
import { markRemovedToast } from "@/components/RemovedToast";

export function RemoveRsvpButton({
  matchdayId,
  rsvpId,
  name,
}: {
  matchdayId: string;
  rsvpId: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        aria-label={`Remove ${name}`}
        data-testid="remove-rsvp"
        data-name={name}
        onClick={() => setOpen(true)}
        className="grid h-[18px] w-[18px] shrink-0 place-items-center text-[16px] leading-none opacity-40 transition group-hover:opacity-100 group-focus-within:opacity-100"
        style={{ color: "#9CA3AF" }}
      >
        ×
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Remove ${name}?`}
        testId="remove-rsvp-sheet"
      >
        <p className="text-ink-soft">They’ll need to sign up again.</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            data-testid="remove-rsvp-cancel"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="remove-rsvp-confirm"
            onClick={() => {
              const data = new FormData();
              data.set("matchdayId", matchdayId);
              data.set("rsvpId", rsvpId);
              markRemovedToast();
              setOpen(false);
              startTransition(async () => {
                await removeOrganiserRsvp(data);
                router.refresh();
              });
            }}
            className="inline-flex min-h-12 items-center rounded-full bg-danger px-5 text-sm font-semibold text-cream hover:opacity-90"
          >
            Remove
          </button>
        </div>
      </Sheet>
    </>
  );
}
