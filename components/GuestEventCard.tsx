"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GuestRsvpForm } from "@/components/GuestRsvpForm";
import type { Position } from "@/lib/positions";

type DisplayBit = { text: string; tbd: boolean };

export function GuestEventCard({
  publicId,
  sport,
  positions,
  title,
  when,
  where,
  goingCount,
  outCount,
  name,
  status,
  position,
  calendarHref,
}: {
  publicId: string;
  sport: string;
  positions: Position[];
  title: string;
  when: DisplayBit;
  where: DisplayBit;
  goingCount: number;
  outCount: number;
  name: string;
  status: "GOING" | "OUT";
  position: string | null;
  calendarHref: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const statusCopy =
    status === "GOING"
      ? `You're going${position ? ` · ${position}` : ""}.`
      : "You're out.";

  return (
    <section data-testid="event-card" className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Matchday
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
          {title}
        </h1>
        <p
          data-testid="event-when"
          className={`mt-4 text-lg ${when.tbd ? "text-ink/40" : "text-ink-soft"}`}
        >
          {when.text}
        </p>
        <p
          data-testid="event-where"
          className={`mt-1 text-lg ${where.tbd ? "text-ink/40" : "text-ink-soft"}`}
        >
          {where.text}
        </p>
        <p data-testid="event-counts" className="mt-4 text-lg">
          Going · {goingCount}
          {outCount > 0 ? ` · Out · ${outCount}` : ""}
        </p>
      </div>

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
