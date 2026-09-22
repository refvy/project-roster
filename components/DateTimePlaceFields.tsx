"use client";

import { useState, type ReactNode } from "react";
import { DateSheet } from "@/components/DateSheet";
import { PlaceSheet } from "@/components/PlaceSheet";
import { TimeSheet } from "@/components/TimeSheet";
import { truncateMapUrl } from "@/lib/map-url";
import { snapToQuarter } from "@/lib/time-options";
import { formatWhenSummary } from "@/lib/when-where";

function formatTimeSummary(start: string, end: string) {
  if (!start) return "";
  return end ? `${start}–${end}` : start;
}

function SummaryRow({
  filled,
  emptyLabel,
  addTestId,
  editTestId,
  summaryTestId,
  summary,
  extra,
  disabled,
  onOpen,
}: {
  filled: boolean;
  emptyLabel: string;
  addTestId: string;
  editTestId: string;
  summaryTestId: string;
  summary: string;
  extra?: ReactNode;
  disabled?: boolean;
  onOpen: () => void;
}) {
  if (!filled) {
    return (
      <button
        type="button"
        data-testid={addTestId}
        disabled={disabled}
        onClick={onOpen}
        className="flex min-h-16 w-full items-center text-left text-lg text-ink/40 disabled:opacity-40"
      >
        {emptyLabel}
      </button>
    );
  }
  return (
    <div className="flex min-h-16 items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p data-testid={summaryTestId} className="truncate text-lg font-medium">
          {summary}
        </p>
        {extra}
      </div>
      <button
        type="button"
        data-testid={editTestId}
        onClick={onOpen}
        className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
      >
        Edit
      </button>
    </div>
  );
}

export function DateTimePlaceFields({
  startDate,
  startTime,
  endTime,
  venue,
  mapUrl,
}: {
  startDate?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  mapUrl?: string;
}) {
  const [date, setDate] = useState(startDate ?? "");
  const [start, setStart] = useState(startTime ? snapToQuarter(startTime) : "");
  const [end, setEnd] = useState(endTime ? snapToQuarter(endTime) : "");
  const [place, setPlace] = useState(venue ?? "");
  const [map, setMap] = useState(mapUrl ?? "");
  const [sheet, setSheet] = useState<"date" | "time" | "place" | null>(null);

  const dateLabel = formatWhenSummary(date, "", "");
  const timeLabel = formatTimeSummary(start, end);
  const whenLabel = formatWhenSummary(date, start, end);

  return (
    <>
      <input type="hidden" name="startDate" data-testid="start-date" value={date} />
      <input type="hidden" name="startTime" data-testid="start-time" value={start} />
      <input type="hidden" name="endTime" data-testid="end-time" value={end} />
      <input type="hidden" name="venue" value={place} />
      <input type="hidden" name="place" value={place} />
      <input type="hidden" name="mapUrl" value={map} />
      <input type="hidden" name="hasTime" value={start ? "1" : ""} />

      <div className="rounded-2xl border border-ink/10 bg-surface px-4">
        <div className="border-b border-ink/10">
          <SummaryRow
            filled={Boolean(date)}
            emptyLabel="Add date"
            addTestId="add-date-row"
            editTestId="edit-date"
            summaryTestId="when-summary"
            summary={whenLabel}
            extra={
              date ? (
                <p data-testid="date-summary" className="sr-only">
                  {dateLabel}
                </p>
              ) : null
            }
            onOpen={() => setSheet("date")}
          />
        </div>
        <div className="border-b border-ink/10">
          <SummaryRow
            filled={Boolean(start)}
            emptyLabel="Add time"
            addTestId="add-time-row"
            editTestId="edit-time"
            summaryTestId="time-summary"
            summary={timeLabel}
            disabled={!date}
            onOpen={() => setSheet("time")}
          />
        </div>
        <div>
          <SummaryRow
            filled={Boolean(place)}
            emptyLabel="Add place"
            addTestId="add-place-row"
            editTestId="edit-place"
            summaryTestId="place-summary"
            summary={place}
            extra={
              map ? (
                <p
                  data-testid="place-map-chip"
                  className="truncate text-sm text-ink/40"
                >
                  {truncateMapUrl(map)}
                </p>
              ) : null
            }
            onOpen={() => setSheet("place")}
          />
        </div>
      </div>

      <DateSheet
        open={sheet === "date"}
        date={date}
        onClose={() => setSheet(null)}
        onSave={(nextDate) => {
          setDate(nextDate);
          if (!nextDate) {
            setStart("");
            setEnd("");
          }
          setSheet(null);
        }}
      />
      <TimeSheet
        open={sheet === "time"}
        startTime={start}
        endTime={end}
        onClose={() => setSheet(null)}
        onSave={(nextStart, nextEnd) => {
          setStart(nextStart);
          setEnd(nextStart ? nextEnd : "");
          setSheet(null);
        }}
      />
      <PlaceSheet
        open={sheet === "place"}
        venue={place}
        mapUrl={map}
        onClose={() => setSheet(null)}
        onSave={(nextVenue, nextMap) => {
          setPlace(nextVenue);
          setMap(nextVenue ? nextMap : "");
          setSheet(null);
        }}
      />
    </>
  );
}
