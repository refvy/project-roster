"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/Sheet";
import {
  HOURS_24,
  MINUTE_STEPS,
  addOneHour,
  isQuarterTime,
  joinTime,
  splitTime,
} from "@/lib/time-options";
import { bangkokTodayDate } from "@/lib/when-where";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const selectClass =
  "min-h-14 rounded-2xl border border-ink/10 bg-surface px-4 text-lg text-ink outline-none ring-accent/30 focus:ring-4";

function yearMonthOf(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  return { year, month };
}

function addMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function mondayOffset(year: number, month: number) {
  const weekday = new Date(year, month - 1, 1).getDay();
  return (weekday + 6) % 7;
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DateSheet({
  open,
  date,
  startTime,
  endTime,
  onClose,
  onSave,
}: {
  open: boolean;
  date: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
  onSave: (date: string, start: string, end: string) => void;
}) {
  const [{ year, month }, setCursor] = useState(() =>
    yearMonthOf(date || bangkokTodayDate()),
  );
  const [draftDate, setDraftDate] = useState(date);
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);
  const today = bangkokTodayDate();

  useEffect(() => {
    if (!open) return;
    setDraftDate(date);
    setStart(startTime);
    setEnd(endTime);
    setCursor(yearMonthOf(date || bangkokTodayDate()));
  }, [open, date, startTime, endTime]);

  const cells = useMemo(() => {
    const pad = mondayOffset(year, month);
    const days = daysInMonth(year, month);
    const list: Array<{ day: number; iso: string } | null> = Array.from(
      { length: pad },
      () => null,
    );
    for (let day = 1; day <= days; day += 1) {
      list.push({ day, iso: isoDate(year, month, day) });
    }
    return list;
  }, [year, month]);

  const startParts = splitTime(start);
  const endParts = splitTime(end || (start ? addOneHour(start).time : ""));

  function setStartPart(part: "hour" | "minute", value: string) {
    if (!value) {
      setStart("");
      setEnd("");
      return;
    }
    const nextHour = part === "hour" ? value : startParts.hour || value;
    const nextMinute =
      part === "minute" ? value : startParts.minute || "00";
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
    <Sheet open={open} onClose={onClose} title="Add date" testId="date-sheet">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          data-testid="cal-prev"
          onClick={() => setCursor((cur) => addMonth(cur.year, cur.month, -1))}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg font-semibold text-ink-soft hover:bg-cream-deep"
        >
          ‹
        </button>
        <p
          data-testid="cal-month"
          data-month={`${year}-${String(month).padStart(2, "0")}`}
          className="font-display text-xl tracking-tight"
        >
          {monthLabel(year, month)}
        </p>
        <button
          type="button"
          data-testid="cal-next"
          onClick={() => setCursor((cur) => addMonth(cur.year, cur.month, 1))}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg font-semibold text-ink-soft hover:bg-cream-deep"
        >
          ›
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-ink/40">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) =>
          cell ? (
            <button
              key={cell.iso}
              type="button"
              data-testid={`cal-day-${cell.iso}`}
              aria-pressed={draftDate === cell.iso}
              onClick={() => setDraftDate(cell.iso)}
              className={`min-h-11 rounded-full text-sm font-semibold ${
                draftDate === cell.iso
                  ? "bg-accent text-on-accent"
                  : cell.iso === today
                    ? "ring-2 ring-accent/40"
                    : "text-ink hover:bg-cream-deep"
              }`}
            >
              {cell.day}
            </button>
          ) : (
            <span key={`pad-${index}`} />
          ),
        )}
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-ink-soft">Start time</legend>
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
            <legend className="text-sm font-medium text-ink-soft">End time</legend>
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
          data-testid="date-sheet-clear"
          onClick={() => onSave("", "", "")}
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:underline"
        >
          Clear
        </button>
        <button
          type="button"
          data-testid="date-sheet-done"
          disabled={!draftDate}
          onClick={() => onSave(draftDate, start, start ? end : "")}
          className="inline-flex min-h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-deep disabled:opacity-40"
        >
          Done
        </button>
      </div>
    </Sheet>
  );
}
