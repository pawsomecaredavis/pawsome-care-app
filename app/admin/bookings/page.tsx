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
  label: string;
  items: Booking[];
};

export default function AdminBookingsPage() {
  const router = useRouter();
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

    const pending = bookings.filter((booking) => booking.status === "pending");
    const current = bookings.filter(
      (booking) => booking.status === "confirmed" && booking.end_date >= today,
    );
    const history = bookings.filter(
      (booking) =>
        booking.status === "completed" ||
        booking.status === "cancelled" ||
        (booking.status === "confirmed" && booking.end_date < today),
    );

    return [
      { label: "Pending Requests", items: pending },
      { label: "Current and Upcoming", items: current },
      { label: "History", items: history },
    ].filter((group) => group.items.length > 0) as BookingGroup[];
  }, [bookings]);

  function getClientLabel(householdId: number) {
    const household = householdMap.get(householdId);

    if (!household) {
      return `Household #${householdId}`;
    }

    return getHouseholdLabel(household);
  }

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
                <span className="portal-kicker">Pending</span>
                <h3>{bookings.filter((booking) => booking.status === "pending").length}</h3>
                <p>These requests still need a decision before the stay is confirmed.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Current</span>
                <h3>
                  {
                    bookings.filter(
                      (booking) =>
                        booking.status === "confirmed" &&
                        booking.end_date >= new Date().toISOString().slice(0, 10),
                    ).length
                  }
                </h3>
                <p>These are the confirmed stays that are current or still upcoming.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">History</span>
                <h3>
                  {
                    bookings.filter(
                      (booking) =>
                        booking.status === "completed" || booking.status === "cancelled",
                    ).length
                  }
                </h3>
                <p>Completed and cancelled bookings stay here for quick reference later.</p>
              </article>
            </div>

            <section className="admin-list-card">
              <h2>Booking Queue</h2>
              {bookingGroups.length === 0 ? (
                <p className="section-copy">
                  No bookings are on file yet. Once a pet parent submits a request, it will
                  show up here.
                </p>
              ) : (
                <div className="portal-status-stack">
                  {bookingGroups.map((group) => (
                    <section key={group.label} className="portal-status-group">
                      <div className="portal-status-heading">
                        <h4>{group.label}</h4>
                        <span>{group.items.length}</span>
                      </div>
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
                              <strong>Service:</strong> {booking.service_type}
                            </p>
                            <p>Notes: {booking.notes || "No notes yet"}</p>
                            <p>Drop-off: {booking.drop_off_note || "No drop-off note yet"}</p>
                            <p>Pick-up: {booking.pick_up_note || "No pick-up note yet"}</p>
                            <p>
                              Special instructions:{" "}
                              {booking.special_instructions || "No special instructions yet"}
                            </p>
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
                              {booking.status === "confirmed" ? (
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
                                Open Stay Detail
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
