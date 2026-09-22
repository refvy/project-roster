"use client";

import { useState } from "react";
import { DateSheet } from "@/components/DateSheet";
import { PlaceSheet } from "@/components/PlaceSheet";
import { truncateMapUrl } from "@/lib/map-url";
import { snapToQuarter } from "@/lib/time-options";
import { formatWhenSummary } from "@/lib/when-where";

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
  const [sheet, setSheet] = useState<"date" | "place" | null>(null);

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
          {whenLabel ? (
            <div className="flex min-h-16 items-center gap-3 py-3">
              <p
                data-testid="when-summary"
                className="min-w-0 flex-1 truncate text-lg font-medium"
              >
                {whenLabel}
              </p>
              <button
                type="button"
                data-testid="edit-date"
                onClick={() => setSheet("date")}
                className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
              >
                Edit
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="add-date-row"
              onClick={() => setSheet("date")}
              className="flex min-h-16 w-full items-center text-left text-lg text-ink/40"
            >
              Add date
            </button>
          )}
        </div>
        <div>
          {place ? (
            <div className="flex min-h-16 items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p
                  data-testid="place-summary"
                  className="truncate text-lg font-medium"
                >
                  {place}
                </p>
                {map ? (
                  <p
                    data-testid="place-map-chip"
                    className="truncate text-sm text-ink/40"
                  >
                    {truncateMapUrl(map)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                data-testid="edit-place"
                onClick={() => setSheet("place")}
                className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
              >
                Edit
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="add-place-row"
              onClick={() => setSheet("place")}
              className="flex min-h-16 w-full items-center text-left text-lg text-ink/40"
            >
              Add place
            </button>
          )}
        </div>
      </div>

      <DateSheet
        open={sheet === "date"}
        date={date}
        startTime={start}
        endTime={end}
        onClose={() => setSheet(null)}
        onSave={(nextDate, nextStart, nextEnd) => {
          setDate(nextDate);
          setStart(nextStart);
          setEnd(nextDate && nextStart ? nextEnd : "");
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
