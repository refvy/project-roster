"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/Sheet";
import {
  HOURS_24,
  MINUTE_STEPS,
  addOneHour,
  isQuarterTime,
  joinTime,
  splitTime,
} from "@/lib/time-options";

const selectClass =
  "min-h-14 rounded-2xl border border-ink/10 bg-surface px-4 text-lg text-ink outline-none ring-accent/30 focus:ring-4";

export function TimeSheet({
  open,
  startTime,
  endTime,
  onClose,
  onSave,
}: {
  open: boolean;
  startTime: string;
  endTime: string;
  onClose: () => void;
  onSave: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);

  useEffect(() => {
    if (!open) return;
    setStart(startTime);
    setEnd(endTime);
  }, [open, startTime, endTime]);

  const startParts = splitTime(start);
  const endParts = splitTime(end || (start ? addOneHour(start).time : ""));

  function setStartPart(part: "hour" | "minute", value: string) {
    if (!value) {
      setStart("");
      setEnd("");
      return;
    }
    const nextHour = part === "hour" ? value : startParts.hour || value;
    const nextMinute = part === "minute" ? value : startParts.minute || "00";
    const next = joinTime(nextHour, nextMinute);
    setStart(next);
    if (end && isQuarterTime(next)) {
      const [startHour, startMinute] = next.split(":").map(Number);
      const [endHour, endMinute] = end.split(":").map(Number);
      if (endHour * 60 + endMinute <= startHour * 60 + startMinute) {
        setEnd(addOneHour(next).time);
      }
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add time" testId="time-sheet">
      <fieldset>
        <legend className="text-sm font-medium text-ink-soft">Start</legend>
        <div className="mt-2 flex items-center gap-2">
          <select
            data-testid="start-hour"
            aria-label="Start hour"
            value={startParts.hour}
            onChange={(event) => setStartPart("hour", event.target.value)}
            className={selectClass}
          >
            <option value="">–</option>
            {HOURS_24.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
          <span className="text-xl font-semibold">:</span>
          <select
            data-testid="start-minute"
            aria-label="Start minute"
            value={startParts.minute}
            onChange={(event) => setStartPart("minute", event.target.value)}
            className={selectClass}
            disabled={!startParts.hour}
          >
            {!startParts.minute ? <option value="">–</option> : null}
            {MINUTE_STEPS.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {start ? (
        end ? (
          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-ink-soft">End</legend>
            <div className="mt-2 flex items-center gap-2">
              <select
                data-testid="end-hour"
                aria-label="End hour"
                value={endParts.hour}
                onChange={(event) =>
                  setEnd(joinTime(event.target.value, endParts.minute || "00"))
                }
                className={selectClass}
              >
                {HOURS_24.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <span className="text-xl font-semibold">:</span>
              <select
                data-testid="end-minute"
                aria-label="End minute"
                value={endParts.minute}
                onChange={(event) =>
                  setEnd(joinTime(endParts.hour, event.target.value))
                }
                className={selectClass}
              >
                {MINUTE_STEPS.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        ) : (
          <button
            type="button"
            data-testid="add-end-time"
            onClick={() => setEnd(addOneHour(start).time)}
            className="mt-5 text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
          >
            Add end time
          </button>
        )
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          data-testid="time-sheet-clear"
          onClick={() => onSave("", "")}
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
        >
          Clear
        </button>
        <button
          type="button"
          data-testid="time-sheet-done"
          disabled={!start}
          onClick={() => onSave(start, end)}
          className="inline-flex min-h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-deep disabled:opacity-40"
        >
          Done
        </button>
      </div>
    </Sheet>
  );
}
