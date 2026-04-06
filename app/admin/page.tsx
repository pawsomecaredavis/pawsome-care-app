"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteShell } from "../components/site-shell";
import {
  type Booking,
  type DailyUpdate,
  type Household,
  type Pet,
  type Profile,
  getAdminDailyUpdatesForHouseholds,
  getAdminBookingsForHouseholds,
  getAdminPets,
  getAuthenticatedAdmin,
  getClientHouseholds,
  getHouseholdLabel,
} from "./admin-data";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadAdminPage() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { user, profile: currentProfile } = await getAuthenticatedAdmin();
        setProfile(currentProfile);

        const clientHouseholds = await getClientHouseholds(user.id);
        const allPets = await getAdminPets();
        const allBookings = await getAdminBookingsForHouseholds(clientHouseholds);
        const allDailyUpdates = await getAdminDailyUpdatesForHouseholds(clientHouseholds);

        setHouseholds(clientHouseholds);
        setPets(allPets);
        setBookings(allBookings);
        setDailyUpdates(allDailyUpdates);
        setIsLoading(false);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load admin data.");
        setIsLoading(false);
      }
    }

    void loadAdminPage();
  }, []);

  function getClientLabel(householdId: number) {
    const household = households.find((item) => item.id === householdId);
    return household ? getHouseholdLabel(household) : `Household #${householdId}`;
  }

  const updateCountByBookingId = dailyUpdates.reduce<Record<number, number>>((counts, update) => {
    counts[update.booking_id] = (counts[update.booking_id] ?? 0) + 1;
    return counts;
  }, {});

  const pendingBookings = bookings.filter((booking) => booking.status === "pending");
  const confirmedBookings = bookings
    .filter((booking) => booking.status === "confirmed")
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const bookingsNeedingFirstUpdate = confirmedBookings.filter(
    (booking) => !updateCountByBookingId[booking.id],
  );
  const currentBookings = confirmedBookings.slice(0, 4);

  async function handleLogout() {
    setErrorMessage("");
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
            <span className="eyebrow">Admin Dashboard</span>
            <h1 className="section-title">Admin overview for today&apos;s active work</h1>
            <p className="section-copy">
              This dashboard now stays focused on what needs attention right now. Deeper
              lists and creation tools live inside dedicated admin sections.
            </p>

            <div className="portal-admin-cta">
              <Link className="button button-primary" href="/admin/bookings">Open Bookings</Link>
              <button
                className="button button-secondary"
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </button>
            </div>

            <div className="admin-grid">
              <article className="admin-card">
                <span className="portal-kicker">Client Profiles</span>
                <h3>{households.length}</h3>
                <p>This counts the client records currently visible in your admin workspace.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Pets</span>
                <h3>{pets.length}</h3>
                <p>This is how many pet records are now visible across your client accounts.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Pending</span>
                <h3>{pendingBookings.length}</h3>
                <p>These booking requests are currently waiting for admin approval.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Needs First Update</span>
                <h3>{bookingsNeedingFirstUpdate.length}</h3>
                <p>Confirmed stays with no daily update published yet show here first.</p>
              </article>
            </div>

            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
            {isLoading ? <p className="portal-loading-text">Loading admin data...</p> : null}

            <section className="admin-list-card admin-priority-card">
              <div className="portal-card-topline">
                <div>
                  <h2>Daily Update Queue</h2>
                  <p className="admin-priority-note">
                    Start here first. These confirmed bookings still need their first client-facing
                    update.
                  </p>
                </div>
                <Link className="button button-primary" href="/admin/bookings">
                  Open Booking Queue
                </Link>
              </div>

              {bookingsNeedingFirstUpdate.length === 0 ? (
                <p className="section-copy">
                  Every confirmed stay already has at least one published daily update.
                </p>
              ) : (
                <div className="admin-list">
                  {bookingsNeedingFirstUpdate.map((booking) => (
                    <article className="admin-list-item admin-priority-item" key={booking.id}>
                      <div className="portal-card-topline">
                        <strong>{getClientLabel(booking.household_id)}</strong>
                        <span className="status-pill status-pill-attention">No update yet</span>
                      </div>
                      <p>
                        <strong>{booking.pet_name || "Pet Booking"}</strong> | {booking.service_type}
                      </p>
                      <p>{booking.start_date} to {booking.end_date}</p>
                      <p>Booking ID: {booking.id}</p>
                      <div className="portal-admin-cta">
                        <Link
                          className="button button-primary"
                          href={`/admin/clients/${booking.household_id}?bookingId=${booking.id}#publish-daily-update`}
                        >
                          Publish First Update
                        </Link>
                        <Link
                          className="button button-secondary"
                          href={`/admin/clients/${booking.household_id}`}
                        >
                          Open Client Workspace
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-list-card">
              <h2>Manage Sections</h2>
              <div className="portal-action-grid">
                <Link className="portal-action-card portal-action-card-secondary" href="/admin/clients">
                  <span className="portal-action-kicker">Clients</span>
                  <strong>Client Profiles</strong>
                  <p>Open each client record to review pets, requests, approvals, and daily updates.</p>
                  <span className="portal-action-link">Open Clients</span>
                </Link>
                <Link className="portal-action-card portal-action-card-primary" href="/admin/pets">
                  <span className="portal-action-kicker">Profiles</span>
                  <strong>Pets</strong>
                  <p>Create and review pet profiles from a dedicated admin section.</p>
                  <span className="portal-action-link">Open Pets</span>
                </Link>
                <Link className="portal-action-card portal-action-card-secondary" href="/admin/bookings">
                  <span className="portal-action-kicker">Calendar</span>
                  <strong>Bookings</strong>
                  <p>Review pending requests, active stays, and booking history in one place.</p>
                  <span className="portal-action-link">Open Bookings</span>
                </Link>
                <Link className="portal-action-card portal-action-card-primary" href="/admin/availability">
                  <span className="portal-action-kicker">Schedule</span>
                  <strong>Availability</strong>
                  <p>Update the live calendar that the services page and booking requests use.</p>
                  <span className="portal-action-link">Open Availability</span>
                </Link>
              </div>
            </section>

            <div className="admin-workspace admin-lists-grid">
              <section className="admin-list-card">
                <div className="portal-card-topline">
                  <h2 style={{ margin: 0 }}>Current Booking Focus</h2>
                  <Link className="button button-secondary" href="/admin/bookings">
                    Open Booking Manager
                  </Link>
                </div>
                {pendingBookings.length === 0 && currentBookings.length === 0 ? (
                  <p className="section-copy">
                    Nothing urgent is on deck right now. New booking requests will surface here first.
                  </p>
                ) : (
                  <div className="portal-status-stack">
                    {pendingBookings.length > 0 ? (
                      <section className="portal-status-group">
                        <div className="portal-status-heading">
                          <h4>Pending Approval</h4>
                          <span>{pendingBookings.length}</span>
                        </div>
                        <div className="admin-list">
                          {pendingBookings.slice(0, 3).map((booking) => (
                            <article className="admin-list-item" key={booking.id}>
                          <div className="portal-card-topline">
                            <strong>{booking.pet_name || "Pet Booking"}</strong>
                            <span className="status-pill status-pill-pending">pending</span>
                          </div>
                          <p>{getClientLabel(booking.household_id)}</p>
                          <p>{booking.service_type}</p>
                          <p>{booking.start_date} to {booking.end_date}</p>
                          <Link className="button button-secondary" href="/admin/bookings">
                            Review in Bookings
                          </Link>
                        </article>
                      ))}
                        </div>
                      </section>
                    ) : null}

                    {currentBookings.length > 0 ? (
                      <section className="portal-status-group">
                        <div className="portal-status-heading">
                          <h4>Current Confirmed Bookings</h4>
                          <span>{currentBookings.length}</span>
                        </div>
                        <div className="admin-list">
                          {currentBookings.map((booking) => (
                            <article className="admin-list-item" key={booking.id}>
                          <div className="portal-card-topline">
                            <strong>{booking.pet_name || "Pet Booking"}</strong>
                            <span className="status-pill status-pill-confirmed">confirmed</span>
                          </div>
                          <p>{getClientLabel(booking.household_id)}</p>
                          <p>{booking.service_type}</p>
                          <p>{booking.start_date} to {booking.end_date}</p>
                          <p>
                            Published updates: <strong>{updateCountByBookingId[booking.id] ?? 0}</strong>
                          </p>
                          <div className="portal-admin-cta">
                            <Link
                              className="button button-secondary"
                              href={`/admin/clients/${booking.household_id}?bookingId=${booking.id}#publish-daily-update`}
                            >
                              Open Update Form
                            </Link>
                            <Link className="button button-secondary" href="/admin/bookings">
                              Open Bookings
                            </Link>
                          </div>
                        </article>
                      ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                )}
              </section>

              <section className="admin-list-card">
                <h2>Workflow Notes</h2>
                <div className="portal-mini-steps">
                  <span>1. Review pending requests from the dashboard</span>
                  <span>2. Approve or cancel inside the client profile</span>
                  <span>3. Publish updates after the stay is confirmed</span>
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
