"use client";

import { useState } from "react";
import { SportChip } from "@/components/SportChip";
import { truncateMapUrl } from "@/lib/map-url";
import {
  detailsPreview,
  type DisplayBit,
} from "@/lib/when-where";

export function InvitationCard({
  title,
  sport,
  when,
  where,
  mapUrl,
  whenWhere,
  goingCount,
  outCount,
}: {
  title: string;
  sport?: string;
  when: DisplayBit;
  where: DisplayBit;
  mapUrl?: string | null;
  whenWhere?: string;
  goingCount?: number;
  outCount?: number;
}) {
  const [more, setMore] = useState(false);
  const map = mapUrl?.trim() ?? "";
  const notes = detailsPreview(whenWhere ?? "");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
        Matchday
      </p>
      <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">
        {title}
      </h1>
      {sport ? (
        <p className="mt-2">
          <SportChip sport={sport} testId="sport-label" />
        </p>
      ) : null}
      <p
        data-testid="event-when"
        className={`mt-3 text-lg ${when.tbd ? "text-ink/40" : "text-ink-soft"}`}
      >
        {when.text}
      </p>
      <p
        data-testid="event-where"
        className={`text-lg ${where.tbd ? "text-ink/40" : "text-ink-soft"}`}
      >
        {where.text}
      </p>
      {map ? (
        <div data-testid="event-map-row" className="min-h-11">
          <a
            href={map}
            target="_blank"
            rel="noreferrer"
            data-testid="event-map"
            className="block truncate text-lg font-medium text-accent-deep underline underline-offset-4"
          >
            {truncateMapUrl(map)}
          </a>
        </div>
      ) : null}
      {notes.text ? (
        <div className="mt-1">
          <p
            data-testid="event-details"
            className="whitespace-pre-wrap text-ink-soft"
          >
            {more ? notes.text : notes.preview}
          </p>
          {notes.overflow ? (
            <button
              type="button"
              data-testid="more-whenwhere"
              onClick={() => setMore((open) => !open)}
              className="mt-1 text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
            >
              {more ? "Less" : "More"}
            </button>
          ) : null}
        </div>
      ) : null}
      {goingCount != null ? (
        <p data-testid="event-counts" className="mt-3 text-lg">
          Going · {goingCount}
          {outCount && outCount > 0 ? ` · Out · ${outCount}` : ""}
        </p>
      ) : null}
    </div>
  );
}
