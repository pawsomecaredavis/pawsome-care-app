"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "../../components/site-shell";
import {
  type Booking,
  type Household,
  getAdminBookingsForHouseholds,
  getAuthenticatedAdmin,
  getClientHouseholds,
  getHouseholdLabel,
} from "../admin-data";
import { supabase } from "../../../lib/supabase";

type BookingGroup = {
  key: string;
  label: string;
  description: string;
  items: Booking[];
};

function formatServiceLabel(serviceType: string) {
  if (serviceType === "meet-and-greet") {
    return "Meet & Greet";
  }

  return serviceType
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "today" | "upcoming" | "meet-and-greet" | "history"
  >("all");
  const [households, setHouseholds] = useState<Household[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUpdatingBookingId, setIsUpdatingBookingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadBookingsPage() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { user } = await getAuthenticatedAdmin();

        const clientHouseholds = await getClientHouseholds(user.id);
        setHouseholds(clientHouseholds);
        setBookings(await getAdminBookingsForHouseholds(clientHouseholds));
        setIsLoading(false);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load the booking manager.",
        );
        setIsLoading(false);
      }
    }

    void loadBookingsPage();
  }, []);

  const householdMap = useMemo(
    () => new Map(households.map((household) => [household.id, household])),
    [households],
  );

  const bookingGroups = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    const pendingStays = bookings.filter(
      (booking) => booking.status === "pending" && booking.service_type !== "meet-and-greet",
    );
    const todaysStays = bookings.filter(
      (booking) =>
        booking.status === "confirmed" &&
        booking.service_type !== "meet-and-greet" &&
        booking.start_date <= today &&
        booking.end_date >= today,
    );
    const upcomingStays = bookings.filter(
      (booking) =>
        booking.status === "confirmed" &&
        booking.service_type !== "meet-and-greet" &&
        booking.start_date > today,
    );
    const upcomingMeetAndGreets = bookings.filter(
      (booking) =>
        booking.service_type === "meet-and-greet" &&
        (booking.status === "pending" || booking.status === "confirmed") &&
        booking.start_date >= today,
    );
    const history = bookings
      .filter(
        (booking) =>
          booking.status === "completed" ||
          booking.status === "cancelled" ||
          (booking.status === "confirmed" && booking.end_date < today),
      )
      .sort((a, b) => b.start_date.localeCompare(a.start_date));

    return [
      {
        key: "pending",
        label: "Needs Decision",
        description: "Start here. These booking requests are still waiting for approval.",
        items: pendingStays,
      },
      {
        key: "today",
        label: "Today’s Active Stays",
        description: "These are the confirmed stays that need updates or completion work today.",
        items: todaysStays,
      },
      {
        key: "upcoming",
        label: "Upcoming Stays",
        description: "Confirmed future stays that are already on the calendar.",
        items: upcomingStays,
      },
      {
        key: "meet-and-greet",
        label: "Upcoming Meet & Greets",
        description: "Intro appointments stay visible here, separate from daily update work.",
        items: upcomingMeetAndGreets,
      },
      {
        key: "history",
        label: "History",
        description: "Completed, cancelled, and past stays remain here for reference.",
        items: history,
      },
    ].filter((group) => group.items.length > 0) as BookingGroup[];
  }, [bookings]);
  const visibleBookingGroups =
    activeFilter === "all"
      ? bookingGroups
      : bookingGroups.filter((group) => group.key === activeFilter);

  function getClientLabel(householdId: number) {
    const household = householdMap.get(householdId);

    if (!household) {
      return `Household #${householdId}`;
    }

    return getHouseholdLabel(household);
  }

  const today = new Date().toISOString().slice(0, 10);
  const pendingCount = bookings.filter((booking) => booking.status === "pending").length;
  const todaysStayCount = bookings.filter(
    (booking) =>
      booking.status === "confirmed" &&
      booking.service_type !== "meet-and-greet" &&
      booking.start_date <= today &&
      booking.end_date >= today,
  ).length;
  const upcomingStayCount = bookings.filter(
    (booking) =>
      booking.status === "confirmed" &&
      booking.service_type !== "meet-and-greet" &&
      booking.start_date > today,
  ).length;
  const meetAndGreetCount = bookings.filter(
    (booking) =>
      booking.service_type === "meet-and-greet" &&
      (booking.status === "pending" || booking.status === "confirmed") &&
      booking.start_date >= today,
  ).length;
  const historyCount = bookings.filter(
    (booking) => booking.status === "completed" || booking.status === "cancelled",
  ).length;

  async function handleUpdateBookingStatus(bookingId: number, nextStatus: string) {
    setErrorMessage("");
    setSuccessMessage("");
    setIsUpdatingBookingId(bookingId);

    const { data, error } = await supabase.rpc("admin_update_booking_status", {
      target_booking_id: bookingId,
      next_status: nextStatus,
    });

    setIsUpdatingBookingId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const updatedBooking = Array.isArray(data) ? data[0] : data;

    if (!updatedBooking) {
      setErrorMessage("The booking updated, but we could not read the new record back.");
      return;
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? (updatedBooking as Booking) : booking,
      ),
    );
    setSuccessMessage(`Booking updated to ${nextStatus}.`);
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
            <span className="eyebrow">Admin Bookings</span>
            <h1 className="section-title">Booking manager</h1>
            <p className="section-copy">
              This section is the admin booking workspace. The dashboard home only shows the
              current focus, while this page holds the full queue, active stays, and past
              booking history in one place.
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
            {isLoading ? <p className="portal-loading-text">Loading booking manager...</p> : null}

            <div className="admin-grid">
              <article className="admin-card">
                <span className="portal-kicker">Needs Decision</span>
                <h3>{pendingCount}</h3>
                <p>These requests still need a decision before the stay is confirmed.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Today</span>
                <h3>{todaysStayCount}</h3>
                <p>These confirmed stays are active right now and should stay visible first.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Upcoming</span>
                <h3>{upcomingStayCount}</h3>
                <p>These confirmed stays are scheduled next and already on the calendar.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Meet &amp; Greets</span>
                <h3>{meetAndGreetCount}</h3>
                <p>Intro appointments stay separate from regular stay-update work.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">History</span>
                <h3>{historyCount}</h3>
                <p>Completed and cancelled bookings stay here for quick reference later.</p>
              </article>
            </div>

            <section className="admin-list-card">
              <div className="portal-card-topline">
                <div>
                  <h2>Booking Queue</h2>
                  <p className="admin-priority-note">
                    Filter the queue by task type when you want to focus on one slice of work.
                  </p>
                </div>
              </div>
              <div className="admin-filter-row">
                {[
                  { key: "all", label: "All" },
                  { key: "pending", label: "Needs Decision" },
                  { key: "today", label: "Today" },
                  { key: "upcoming", label: "Upcoming" },
                  { key: "meet-and-greet", label: "M&G" },
                  { key: "history", label: "History" },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    className={`button button-secondary admin-filter-button ${activeFilter === filter.key ? "is-active" : ""}`}
                    type="button"
                    onClick={() =>
                      setActiveFilter(
                        filter.key as "all" | "pending" | "today" | "upcoming" | "meet-and-greet" | "history",
                      )
                    }
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {visibleBookingGroups.length === 0 ? (
                <p className="section-copy">
                  No bookings match this filter right now.
                </p>
              ) : (
                <div className="portal-status-stack">
                  {visibleBookingGroups.map((group) => (
                    <section key={group.label} className="portal-status-group">
                      <div className="portal-status-heading">
                        <h4>{group.label}</h4>
                        <span>{group.items.length}</span>
                      </div>
                      <p className="admin-priority-note">{group.description}</p>
                      <div className="admin-list">
                        {group.items.map((booking) => (
                          <article className="admin-list-item" key={booking.id}>
                            <div className="portal-card-topline">
                              <strong>{getClientLabel(booking.household_id)}</strong>
                              <span className={`status-pill status-pill-${booking.status}`}>
                                {booking.status}
                              </span>
                            </div>
                            <p>
                              <strong>Stay Dates:</strong> {booking.start_date} to {booking.end_date}
                            </p>
                            <p>
                              <strong>Pet:</strong> {booking.pet_name || "Not linked yet"}
                            </p>
                            <p>
                              <strong>Service:</strong> {formatServiceLabel(booking.service_type)}
                            </p>
                            {booking.notes ? <p>Notes: {booking.notes}</p> : null}
                            {booking.drop_off_note ? <p>Drop-off: {booking.drop_off_note}</p> : null}
                            {booking.pick_up_note ? <p>Pick-up: {booking.pick_up_note}</p> : null}
                            {booking.special_instructions ? (
                              <p>Special instructions: {booking.special_instructions}</p>
                            ) : null}
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                                marginTop: "14px",
                              }}
                            >
                              {booking.status === "pending" ? (
                                <>
                                  <button
                                    className="button button-secondary"
                                    type="button"
                                    onClick={() =>
                                      void handleUpdateBookingStatus(booking.id, "confirmed")
                                    }
                                    disabled={isUpdatingBookingId === booking.id}
                                  >
                                    {isUpdatingBookingId === booking.id ? "Saving..." : "Confirm"}
                                  </button>
                                  <button
                                    className="button button-secondary"
                                    type="button"
                                    onClick={() =>
                                      void handleUpdateBookingStatus(booking.id, "cancelled")
                                    }
                                    disabled={isUpdatingBookingId === booking.id}
                                  >
                                    {isUpdatingBookingId === booking.id ? "Saving..." : "Cancel"}
                                  </button>
                                </>
                              ) : null}
                              {booking.status === "confirmed" &&
                              booking.service_type !== "meet-and-greet" ? (
                                <Link
                                  className="button button-primary"
                                  href={`/admin/clients/${booking.household_id}?bookingId=${booking.id}#publish-daily-update`}
                                >
                                  Publish Update
                                </Link>
                              ) : null}
                              {booking.status === "confirmed" &&
                              booking.service_type !== "meet-and-greet" ? (
                                <button
                                  className="button button-secondary"
                                  type="button"
                                  onClick={() =>
                                    void handleUpdateBookingStatus(booking.id, "completed")
                                  }
                                  disabled={isUpdatingBookingId === booking.id}
                                >
                                  {isUpdatingBookingId === booking.id
                                    ? "Saving..."
                                    : "Mark Completed"}
                                </button>
                              ) : null}
                              <Link
                                className="button button-secondary"
                                href={`/admin/clients/${booking.household_id}?bookingId=${booking.id}#selected-stay-detail`}
                              >
                                {booking.service_type === "meet-and-greet"
                                  ? "Open Appointment"
                                  : "Open Stay Detail"}
                              </Link>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
