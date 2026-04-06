"use client";

import { useEffect, useState } from "react";
import {
  type AvailabilityDayStatus,
  type AvailabilityMonth,
  buildAvailabilityMonths,
  getAvailabilityLastUpdated,
  getAvailabilityWindow,
} from "../../lib/availability";
import { supabase } from "../../lib/supabase";

type CalendarCell =
  | { key: string; empty: true }
  | { key: string; empty: false; day: number; available: boolean };

export function AvailabilityCalendar() {
  const [rows, setRows] = useState<AvailabilityDayStatus[]>([]);
  const [months, setMonths] = useState<AvailabilityMonth[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("recently");

  useEffect(() => {
    async function loadAvailability() {
      try {
        const { startDate, endDate } = getAvailabilityWindow(4);
        const { data, error } = await supabase.rpc("get_public_availability", {
          start_date: startDate,
          end_date: endDate,
        });

        if (error) {
          throw error;
        }

        const rows = (data as AvailabilityDayStatus[]) ?? [];
        setRows(rows);
        setMonths(buildAvailabilityMonths(rows, 4));
        setLastUpdated(getAvailabilityLastUpdated(rows));
      } catch {
        setLastUpdated("unavailable right now");
      }
    }

    void loadAvailability();
  }, []);

  function isPastDate(month: AvailabilityMonth, day: number) {
    const [monthName, yearText] = month.label.split(" ");
    const current = new Date(`${monthName} ${day}, ${yearText}`);
    const today = new Date();
    current.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return current < today;
  }

  const month = months[currentIndex];
  const dayCells: CalendarCell[] = month
    ? [
        ...Array.from({ length: month.startDay }, (_, emptyIndex) => ({ key: `empty-${emptyIndex}`, empty: true as const })),
        ...Array.from({ length: month.totalDays }, (_, dayIndex) => {
          const day = dayIndex + 1;
          const available = month.available.includes(day) && !isPastDate(month, day);
          return { key: `day-${day}`, day, available, empty: false as const };
        }),
      ]
    : [];

  const monthNotes = dayCells
    .filter((cell): cell is Extract<CalendarCell, { empty: false }> => !cell.empty)
    .map((cell) => ({
      ...cell,
      note: rows.find((row) => row.date === cell.key)?.note || null,
    }))
    .filter((cell) => Boolean(cell.note?.trim()) && !cell.available);

  return (
    <div className="availability-card" id="availability">
      <div className="availability-head">
        <span className="eyebrow">Availability</span>
        <div className="availability-toolbar">
          <h3>{month?.label || "Availability Calendar"}</h3>
          <div className="availability-controls" aria-label="Calendar month controls">
            <button className="availability-nav" type="button" aria-label="Previous month" onClick={() => setCurrentIndex((current) => (current - 1 + months.length) % months.length)} disabled={!months.length}>
              &#8249;
            </button>
            <button className="availability-nav" type="button" aria-label="Next month" onClick={() => setCurrentIndex((current) => (current + 1) % months.length)} disabled={!months.length}>
              &#8250;
            </button>
          </div>
        </div>
      </div>
      <div className="availability-legend" aria-label="Availability legend">
        <span><i className="availability-swatch availability-swatch-open" />Available</span>
        <span><i className="availability-swatch availability-swatch-closed" />Not available</span>
      </div>
      <div className="availability-calendar" aria-live="polite">
        <div className="availability-weekdays" aria-hidden="true"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
        <div className="availability-grid">
          {dayCells.map((cell) =>
            cell.empty ? (
              <span key={cell.key} className="availability-day availability-day-empty" aria-hidden="true" />
            ) : (
              <span key={cell.key} className={`availability-day ${cell.available ? "is-available" : "is-unavailable"}`} aria-label={`${month?.label} ${cell.day} ${cell.available ? "available" : "not available"}`}>
                {cell.day}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="availability-updated"><span className="availability-check">&#10003;</span><span>Calendar last updated {lastUpdated}</span></div>
      {monthNotes.length > 0 ? (
        <div className="admin-list" style={{ marginTop: "18px" }}>
          {monthNotes.map((entry) => (
            <article className="admin-list-item" key={`public-note-${entry.key}`}>
              <strong>
                {month?.label} {entry.day}
              </strong>
              <p>{entry.note}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
