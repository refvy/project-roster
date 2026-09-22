"use client";

import { useState } from "react";
import { DateSheet } from "@/components/DateSheet";
import { PlaceSheet } from "@/components/PlaceSheet";
import { TimeSheet } from "@/components/TimeSheet";
import { truncateMapUrl } from "@/lib/map-url";
import { snapToQuarter } from "@/lib/time-options";
import { formatBangkokDate, bangkokDateTimeToUtc } from "@/lib/when-where";

function FieldRow({
  label,
  value,
  emptyLabel,
  testId,
  disabled,
  onClick,
  onClear,
}: {
  label: string;
  value: string;
  emptyLabel: string;
  testId: string;
  disabled?: boolean;
  onClick: () => void;
  onClear: () => void;
}) {
  const filled = Boolean(value);
  return (
    <div className="flex items-stretch border-b border-ink/10">
      <button
        type="button"
        data-testid={testId}
        disabled={disabled}
        onClick={onClick}
        className="flex min-h-16 flex-1 items-center justify-between gap-4 py-3 text-left disabled:opacity-40"
      >
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        <span
          className={`max-w-[70%] truncate text-right text-lg ${
            filled ? "font-medium text-ink" : "text-ink/40"
          }`}
        >
          {filled ? value : emptyLabel}
        </span>
      </button>
      {filled ? (
        <button
          type="button"
          data-testid={`${testId}-clear`}
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={onClear}
          className="px-2 text-lg font-semibold text-ink-soft"
        >
          ×
        </button>
      ) : null}
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

  const dateLabel = date
    ? formatBangkokDate(bangkokDateTimeToUtc(date, "12:00") ?? new Date(`${date}T00:00:00Z`))
    : "";
  const timeLabel = start ? (end ? `${start} – ${end}` : start) : "";
  const placeLabel = place || (map ? truncateMapUrl(map) : "");

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
        <FieldRow
          label="Date"
          value={dateLabel}
          emptyLabel="Add date"
          testId="add-date-row"
          onClick={() => setSheet("date")}
          onClear={() => {
            setDate("");
            setStart("");
            setEnd("");
          }}
        />
        <FieldRow
          label="Time"
          value={timeLabel}
          emptyLabel="Add time"
          testId="add-time-row"
          disabled={!date}
          onClick={() => setSheet("time")}
          onClear={() => {
            setStart("");
            setEnd("");
          }}
        />
        <FieldRow
          label="Place"
          value={placeLabel}
          emptyLabel="Add place"
          testId="add-place-row"
          onClick={() => setSheet("place")}
          onClear={() => {
            setPlace("");
            setMap("");
          }}
        />
      </div>

      <DateSheet
        open={sheet === "date"}
        value={date}
        onClose={() => setSheet(null)}
        onSave={(next) => {
          setDate(next);
          if (!next) {
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
          setEnd(nextEnd);
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
          setMap(nextMap);
          setSheet(null);
        }}
      />
    </>
  );
}
