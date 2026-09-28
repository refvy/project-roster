"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GuestRsvpForm } from "@/components/GuestRsvpForm";
import { InvitationCard } from "@/components/InvitationCard";
import type { Position } from "@/lib/positions";
import type { DisplayBit } from "@/lib/when-where";

export function GuestEventCard({
  publicId,
  sport,
  positions,
  title,
  when,
  where,
  mapUrl,
  whenWhere,
  goingCount,
  outCount,
  name,
  status,
  position,
  calendarHref,
  goingNames,
}: {
  publicId: string;
  sport: string;
  positions: Position[];
  title: string;
  when: DisplayBit;
  where: DisplayBit;
  mapUrl?: string | null;
  whenWhere?: string;
  goingCount: number;
  outCount: number;
  name: string;
  status: "GOING" | "OUT";
  position: string | null;
  calendarHref: string | null;
  goingNames?: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const statusCopy =
    status === "GOING"
      ? `You're going${position ? ` · ${position}` : ""}.`
      : "You're out.";

  return (
    <section data-testid="event-card" className="flex flex-col gap-6">
      <InvitationCard
        title={title}
        sport={sport}
        when={when}
        where={where}
        mapUrl={mapUrl}
        whenWhere={whenWhere}
        goingCount={goingCount}
        outCount={outCount}
      />

      <div className="flex flex-wrap items-center gap-4">
        {editing ? null : (
          <p
            data-testid="rsvp-confirmed"
            className="rounded-2xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent-deep"
          >
            {statusCopy}
          </p>
        )}
        <button
          type="button"
          data-testid="change-status"
          onClick={() => setEditing((open) => !open)}
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
        >
          Change status
        </button>
      </div>

      {editing ? (
        <GuestRsvpForm
          publicId={publicId}
          sport={sport}
          positions={positions}
          defaultName={name}
          defaultStatus={status}
          defaultPosition={position}
          goingNames={goingNames}
          ownName={name}
          onChangeStatus={() => setEditing(true)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : null}

      {calendarHref ? (
        <div className="sticky bottom-4 z-20 pt-2">
          <a
            href={calendarHref}
            data-testid="add-to-calendar"
            className="inline-flex min-h-16 w-full items-center justify-center rounded-full bg-accent px-8 text-lg font-semibold text-on-accent hover:bg-accent-deep"
          >
            Add to calendar
          </a>
        </div>
      ) : null}
    </section>
  );
}
