"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "../../components/site-shell";
import {
  type AvailabilityDayStatus,
  buildAvailabilityMonths,
  getAvailabilityLastUpdated,
  getAvailabilityWindow,
  type AvailabilityMonth,
} from "../../../lib/availability";
import { supabase } from "../../../lib/supabase";
import { getAuthenticatedAdmin, type Profile } from "../admin-data";

type CalendarCell =
  | { key: string; empty: true }
  | {
      key: string;
      empty: false;
      day: number;
      date: string;
      available: boolean;
      isPast: boolean;
      note: string | null;
    };

export default function AdminAvailabilityPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<AvailabilityDayStatus[]>([]);
  const [months, setMonths] = useState<AvailabilityMonth[]>([]);
  const [lastUpdated, setLastUpdated] = useState("recently");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingDate, setIsSavingDate] = useState<string | null>(null);
  const [isSavingMonth, setIsSavingMonth] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    async function loadAvailabilityEditor() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { profile: currentProfile } = await getAuthenticatedAdmin();
        setProfile(currentProfile);

        const { startDate, endDate } = getAvailabilityWindow(4, now);
        const { data, error } = await supabase.rpc("get_public_availability", {
          start_date: startDate,
          end_date: endDate,
        });

        if (error) {
          throw error;
        }

        const nextRows = (data as AvailabilityDayStatus[]) ?? [];
        setRows(nextRows);
        setMonths(buildAvailabilityMonths(nextRows, 4, now));
        setLastUpdated(getAvailabilityLastUpdated(nextRows));
        setSelectedDate(startDate);
        const firstSelectedRow = nextRows.find((row) => row.date === startDate);
        setSelectedNote(firstSelectedRow?.note || "");
        setIsLoading(false);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load availability editor.",
        );
        setIsLoading(false);
      }
    }

    void loadAvailabilityEditor();
  }, [now]);

  function getMonthDate(monthIndex: number, day: number) {
    const date = new Date(now.getFullYear(), now.getMonth() + monthIndex, day);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayText = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${dayText}`;
  }

  function getMonthRange(monthIndex: number) {
    const start = new Date(now.getFullYear(), now.getMonth() + monthIndex, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + monthIndex + 1, 0);
    const startDate = new Date(Math.max(start.getTime(), new Date().setHours(0, 0, 0, 0)));
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, "0");
    const day = String(startDate.getDate()).padStart(2, "0");
    const startString = `${year}-${month}-${day}`;
    const endString = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    return { startString, endString };
  }

  const rowMap = useMemo(
    () => new Map(rows.map((row) => [row.date, row])),
    [rows],
  );

  const month = months[currentIndex];
  const dayCells: CalendarCell[] = month
    ? [
        ...Array.from({ length: month.startDay }, (_, emptyIndex) => ({
          key: `empty-${emptyIndex}`,
          empty: true as const,
        })),
        ...Array.from({ length: month.totalDays }, (_, dayIndex) => {
          const day = dayIndex + 1;
          const dateString = getMonthDate(currentIndex, day);
          const currentDate = new Date(`${dateString}T00:00:00`);
          const today = new Date();
          currentDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);

          return {
            key: dateString,
            empty: false as const,
            day,
            date: dateString,
            available: month.available.includes(day),
            isPast: currentDate < today,
            note: rowMap.get(dateString)?.note || null,
          };
        }),
      ]
    : [];

  const selectedRow = selectedDate ? rowMap.get(selectedDate) || null : null;
  const selectedDayCell = selectedDate
    ? dayCells.find((cell) => !cell.empty && cell.date === selectedDate)
    : undefined;
  const selectedAvailability =
    selectedRow?.is_available ??
    (selectedDayCell && !selectedDayCell.empty ? selectedDayCell.available : false);
  const selectedIsPast =
    selectedDayCell && !selectedDayCell.empty ? selectedDayCell.isPast : false;
  const notedDays = dayCells.filter(
    (cell): cell is Extract<CalendarCell, { empty: false }> =>
      !cell.empty && !cell.isPast && Boolean(cell.note?.trim()),
  );

  function applySingleDateLocally(date: string, nextIsAvailable: boolean, nextNote: string | null) {
    const hasDate = rows.some((row) => row.date === date);
    const nextUpdatedAt = new Date().toISOString();
    const nextRows = hasDate
      ? rows.map((row) =>
          row.date === date
            ? {
                ...row,
                is_available: nextIsAvailable,
                note: nextNote,
                updated_at: nextUpdatedAt,
              }
            : row,
        )
      : [
          ...rows,
          {
            date,
            is_available: nextIsAvailable,
            note: nextNote,
            updated_at: nextUpdatedAt,
          },
        ];

    setRows(nextRows);
    setMonths(buildAvailabilityMonths(nextRows, 4, now));
    setLastUpdated(getAvailabilityLastUpdated(nextRows));
  }

  async function handleToggleDay(date: string, currentlyAvailable: boolean) {
    setErrorMessage("");
    setSuccessMessage("");
    setIsSavingDate(date);

    const { data, error } = await supabase.rpc("admin_set_availability", {
      target_date: date,
      next_is_available: !currentlyAvailable,
      next_note: null,
    });

    setIsSavingDate(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSelectedDate(date);
    setSelectedNote((Array.isArray(data) ? data[0] : data)?.note || "");
    applySingleDateLocally(
      date,
      !currentlyAvailable,
      (Array.isArray(data) ? data[0] : data)?.note || null,
    );
    setSuccessMessage(
      `${date} is now marked as ${currentlyAvailable ? "unavailable" : "available"}.`,
    );
  }

  async function handleSaveSelectedNote() {
    if (!selectedDate) {
      setErrorMessage("Please choose a date first.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSavingDate(selectedDate);

    const currentAvailability = selectedAvailability;
    const nextNote = selectedNote.trim() || null;
    const { data, error } = await supabase.rpc("admin_set_availability", {
      target_date: selectedDate,
      next_is_available: currentAvailability,
      next_note: nextNote,
    });

    setIsSavingDate(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    applySingleDateLocally(
      selectedDate,
      currentAvailability,
      (Array.isArray(data) ? data[0] : data)?.note || nextNote,
    );
    setSuccessMessage(`Saved note for ${selectedDate}.`);
  }

  async function handleBulkUpdate(nextIsAvailable: boolean) {
    if (!month) {
      return;
    }

    const { startString, endString } = getMonthRange(currentIndex);
    setErrorMessage("");
    setSuccessMessage("");
    setIsSavingMonth(true);

    const { data, error } = await supabase.rpc("admin_set_availability_range", {
      start_date: startString,
      end_date: endString,
      next_is_available: nextIsAvailable,
      next_note: nextIsAvailable ? null : "Blocked from admin calendar",
    });

    setIsSavingMonth(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const returnedRows = (data as AvailabilityDayStatus[]) ?? [];
    const returnedMap = new Map(returnedRows.map((row) => [row.date, row]));
    const nextRows = rows
      .map((row) => returnedMap.get(row.date) ?? row)
      .concat(returnedRows.filter((row) => !rows.some((existing) => existing.date === row.date)));

    setRows(nextRows);
    setMonths(buildAvailabilityMonths(nextRows, 4, now));
    setLastUpdated(getAvailabilityLastUpdated(nextRows));
    setSuccessMessage(
      `${month.label} is now marked ${nextIsAvailable ? "available" : "unavailable"} for future dates.`,
    );
  }

  async function handleLogout() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/portal");
    router.refresh();
  }

  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card admin-page">
            <span className="eyebrow">Admin Availability</span>
            <h1 className="section-title">Manage booking calendar</h1>
            <p className="section-copy">
              This is the live availability calendar used by the public services page and the
              pet parent booking request flow. Click a date to mark it available or unavailable.
            </p>

            <div className="portal-admin-cta">
              <Link className="button button-secondary" href="/admin">
                Back to Dashboard
              </Link>
              <button
                className="button button-secondary"
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </button>
            </div>

            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
            {successMessage ? <p className="auth-success">{successMessage}</p> : null}
            {isLoading ? <p className="portal-loading-text">Loading availability calendar...</p> : null}

            <div className="admin-grid">
              <article className="admin-card">
                <span className="portal-kicker">Admin</span>
                <h3>{profile?.full_name || "Admin"}</h3>
                <p>Role: <strong>{profile?.role || "unknown"}</strong></p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Current Month</span>
                <h3>{month?.label || "Calendar"}</h3>
                <p>Use the arrows to move through the next four months of availability.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Available Days</span>
                <h3>{month?.available.length ?? 0}</h3>
                <p>This count updates live as you change dates in the selected month.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Last Updated</span>
                <h3>{lastUpdated}</h3>
                <p>Public booking requests will use this same data right away.</p>
              </article>
            </div>

            <div className="admin-workspace">
              <section className="admin-list-card">
                <div className="availability-head">
                  <span className="eyebrow">Live Calendar</span>
                  <div className="availability-toolbar">
                    <h3>{month?.label || "Availability Calendar"}</h3>
                    <div className="availability-controls" aria-label="Calendar month controls">
                      <button
                        className="availability-nav"
                        type="button"
                        aria-label="Previous month"
                        onClick={() =>
                          setCurrentIndex((current) => (current - 1 + months.length) % months.length)
                        }
                        disabled={!months.length}
                      >
                        &#8249;
                      </button>
                      <button
                        className="availability-nav"
                        type="button"
                        aria-label="Next month"
                        onClick={() =>
                          setCurrentIndex((current) => (current + 1) % months.length)
                        }
                        disabled={!months.length}
                      >
                        &#8250;
                      </button>
                    </div>
                  </div>
                </div>
                <div className="portal-admin-cta admin-inline-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => void handleBulkUpdate(true)}
                    disabled={!month || isSavingMonth}
                  >
                    {isSavingMonth ? "Saving..." : "Open Whole Month"}
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => void handleBulkUpdate(false)}
                    disabled={!month || isSavingMonth}
                  >
                    {isSavingMonth ? "Saving..." : "Close Whole Month"}
                  </button>
                </div>
                <div className="availability-legend" aria-label="Availability legend">
                  <span><i className="availability-swatch availability-swatch-open" />Available</span>
                  <span><i className="availability-swatch availability-swatch-closed" />Not available</span>
                </div>
                <div className="availability-calendar" aria-live="polite">
                  <div className="availability-weekdays" aria-hidden="true">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                  </div>
                  <div className="availability-grid">
                    {dayCells.map((cell) =>
                      cell.empty ? (
                        <span key={cell.key} className="availability-day availability-day-empty" aria-hidden="true" />
                      ) : (
                        <button
                          key={cell.key}
                          type="button"
                          className={`availability-day availability-day-button ${cell.available ? "is-available" : "is-unavailable"} ${cell.isPast ? "is-past" : ""}`}
                          aria-label={`${month?.label} ${cell.day} ${cell.available ? "available" : "not available"}`}
                          onClick={() => {
                            setSelectedDate(cell.date);
                            setSelectedNote(cell.note || "");
                          }}
                          disabled={cell.isPast || isSavingDate === cell.date}
                        >
                          <span>{isSavingDate === cell.date ? "..." : cell.day}</span>
                          {cell.note ? <i className="availability-note-dot" /> : null}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </section>

              <section className="admin-list-card">
                <h2>Date Detail</h2>
                {selectedDate ? (
                  <>
                    <p className="section-copy">
                      Selected date: <strong>{selectedDate}</strong>
                    </p>
                    <p className="section-copy">
                      Status:{" "}
                      <strong>
                        {selectedAvailability ? "available" : "unavailable"}
                      </strong>
                    </p>
                    <div className="field field-full" style={{ marginTop: "16px" }}>
                      <label htmlFor="availabilityNote">Date Note</label>
                      <textarea
                        id="availabilityNote"
                        rows={4}
                        value={selectedNote}
                        onChange={(event) => setSelectedNote(event.target.value)}
                        placeholder="Optional note like holiday blackout, vacation, or limited pickup window"
                      />
                    </div>
                    <div className="portal-admin-cta admin-inline-actions">
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() =>
                          void handleToggleDay(
                            selectedDate,
                            selectedAvailability,
                          )
                        }
                        disabled={!selectedDate || isSavingDate === selectedDate || selectedIsPast}
                      >
                        Toggle Availability
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => void handleSaveSelectedNote()}
                        disabled={!selectedDate || isSavingDate === selectedDate}
                      >
                        {isSavingDate === selectedDate ? "Saving..." : "Save Note"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="section-copy">
                    Select a date in the calendar to edit its availability or add a note.
                  </p>
                )}
                <h2 style={{ marginTop: "24px" }}>How To Use It</h2>
                <div className="portal-mini-steps">
                  <span>1. Open the month you want to edit</span>
                  <span>2. Select a day or use whole-month actions</span>
                  <span>3. Add a note for blackout dates, holidays, or special rules</span>
                </div>
                <p className="section-copy" style={{ marginTop: "18px" }}>
                  Past days are locked and automatically show as unavailable. By default, dates after
                  June 2026 also stay unavailable until you manually open them here.
                </p>
                {notedDays.length > 0 ? (
                  <>
                    <h2 style={{ marginTop: "24px" }}>Notes This Month</h2>
                    <div className="admin-list">
                      {notedDays.map((cell) => (
                        <article className="admin-list-item" key={`note-${cell.date}`}>
                          <strong>{cell.date}</strong>
                          <p>{cell.note}</p>
                        </article>
                      ))}
                    </div>
                  </>
                ) : null}
              </section>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
