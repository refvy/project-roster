"use client";

import { useState } from "react";
import { truncateMapUrl } from "@/lib/map-url";
import {
  formatWhenWhereLine,
  type DisplayBit,
} from "@/lib/when-where";

export function InvitationCard({
  title,
  when,
  where,
  mapUrl,
  whenWhere,
  collapseWhenWhere,
  goingCount,
  outCount,
  helper,
}: {
  title: string;
  when: DisplayBit;
  where: DisplayBit;
  mapUrl?: string | null;
  whenWhere?: string;
  collapseWhenWhere?: boolean;
  goingCount?: number;
  outCount?: number;
  helper?: string;
}) {
  const [more, setMore] = useState(false);
  const map = mapUrl?.trim() ?? "";
  const freeform = formatWhenWhereLine(whenWhere ?? "");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
        Matchday
      </p>
      <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">
        {title}
      </h1>
      {helper ? (
        <p data-testid="signup-helper" className="mt-2 text-sm text-ink-soft">
          {helper}
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
        <a
          href={map}
          target="_blank"
          rel="noreferrer"
          data-testid="event-map"
          className="block truncate text-lg font-medium text-accent-deep underline-offset-4 hover:underline"
        >
          {truncateMapUrl(map)}
        </a>
      ) : null}
      {collapseWhenWhere && freeform ? (
        <div className="mt-1">
          <button
            type="button"
            data-testid="more-whenwhere"
            onClick={() => setMore((open) => !open)}
            className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          >
            {more ? "Less" : "More"}
          </button>
          {more ? (
            <p
              data-testid="whenwhere-more"
              className="mt-2 line-clamp-3 whitespace-pre-wrap text-ink-soft"
            >
              {whenWhere}
            </p>
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
