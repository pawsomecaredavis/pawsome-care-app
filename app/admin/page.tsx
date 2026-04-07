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

const ANALYTICS_WINDOW_DAYS = 30;

function formatDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(date);
}

function buildLastNDays(count: number) {
  const dates: string[] = [];
  const today = new Date();

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    dates.push(formatDayKey(date));
  }

  return dates;
}

function formatShortAxisLabel(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

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
  const today = new Date().toISOString().slice(0, 10);
  const analyticsDateKeys = buildLastNDays(ANALYTICS_WINDOW_DAYS);
  const analyticsDateSet = new Set(analyticsDateKeys);
  const nonMeetAndGreetBookings = bookings.filter(
    (booking) => booking.service_type !== "meet-and-greet",
  );
  const bookingsCreatedLast30Days = nonMeetAndGreetBookings.filter((booking) =>
    analyticsDateSet.has(formatDayKey(new Date(booking.created_at))),
  );
  const meetAndGreetsLast30Days = bookings.filter(
    (booking) =>
      booking.service_type === "meet-and-greet" &&
      analyticsDateSet.has(formatDayKey(new Date(booking.created_at))),
  );
  const bookingsPerDaySeries = analyticsDateKeys.map((dateKey) => ({
    dateKey,
    total: bookingsCreatedLast30Days.filter(
      (booking) => formatDayKey(new Date(booking.created_at)) === dateKey,
    ).length,
  }));
  const maxDailyBookings = Math.max(...bookingsPerDaySeries.map((item) => item.total), 1);
  const chartWidth = 640;
  const chartHeight = 220;
  const chartPaddingX = 18;
  const chartPaddingY = 20;
  const chartInnerWidth = chartWidth - chartPaddingX * 2;
  const chartInnerHeight = chartHeight - chartPaddingY * 2;
  const bookingLinePoints = bookingsPerDaySeries
    .map((item, index) => {
      const x =
        chartPaddingX +
        (bookingsPerDaySeries.length === 1
          ? 0
          : (index / (bookingsPerDaySeries.length - 1)) * chartInnerWidth);
      const y =
        chartPaddingY +
        chartInnerHeight -
        (item.total / maxDailyBookings) * chartInnerHeight;

      return `${x},${y}`;
    })
    .join(" ");
  const meetAndGreetHouseholds = new Map<number, string>();

  meetAndGreetsLast30Days.forEach((booking) => {
    const existing = meetAndGreetHouseholds.get(booking.household_id);

    if (!existing || booking.created_at < existing) {
      meetAndGreetHouseholds.set(booking.household_id, booking.created_at);
    }
  });

  const convertedMeetAndGreetHouseholds = Array.from(meetAndGreetHouseholds.entries()).filter(
    ([householdId, firstMeetAndGreetCreatedAt]) =>
      nonMeetAndGreetBookings.some(
        (booking) =>
          booking.household_id === householdId &&
          booking.created_at >= firstMeetAndGreetCreatedAt,
      ),
  ).length;
  const meetAndGreetConversionRate = meetAndGreetHouseholds.size
    ? Math.round((convertedMeetAndGreetHouseholds / meetAndGreetHouseholds.size) * 100)
    : 0;
  const activeClientHouseholds = new Set(
    bookingsCreatedLast30Days.map((booking) => booking.household_id),
  );
  const repeatClientHouseholds = Array.from(activeClientHouseholds).filter((householdId) => {
    const householdBookingCount = bookingsCreatedLast30Days.filter(
      (booking) => booking.household_id === householdId,
    ).length;

    return householdBookingCount > 1;
  }).length;
  const repeatClientRate = activeClientHouseholds.size
    ? Math.round((repeatClientHouseholds / activeClientHouseholds.size) * 100)
    : 0;
  const upcomingMeetAndGreets = bookings
    .filter(
      (booking) =>
        booking.service_type === "meet-and-greet" &&
        (booking.status === "pending" || booking.status === "confirmed") &&
        booking.end_date >= today,
    )
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const pendingBookings = bookings.filter(
    (booking) => booking.status === "pending" && booking.service_type !== "meet-and-greet",
  );
  const confirmedBookings = bookings
    .filter(
      (booking) => booking.status === "confirmed" && booking.service_type !== "meet-and-greet",
    )
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
              <article className="admin-card">
                <span className="portal-kicker">Upcoming M&amp;Gs</span>
                <h3>{upcomingMeetAndGreets.length}</h3>
                <p>Meet &amp; greets stay visible here as upcoming admin tasks.</p>
              </article>
            </div>

            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
            {isLoading ? <p className="portal-loading-text">Loading admin data...</p> : null}

            <section className="admin-list-card analytics-card">
              <div className="portal-card-topline">
                <div>
                  <h2>30-Day Analytics</h2>
                  <p className="admin-priority-note">
                    Based on requests created in the last 30 days. Meet &amp; greets are tracked
                    separately from regular bookings.
                  </p>
                </div>
              </div>

              <div className="admin-grid analytics-summary-grid">
                <article className="admin-card analytics-summary-card">
                  <span className="portal-kicker">Bookings Created</span>
                  <h3>{bookingsCreatedLast30Days.length}</h3>
                  <p>Non-meet-and-greet requests created over the last 30 days.</p>
                </article>
                <article className="admin-card analytics-summary-card">
                  <span className="portal-kicker">Meet &amp; Greets</span>
                  <h3>{meetAndGreetsLast30Days.length}</h3>
                  <p>Total meet &amp; greet requests created over the last 30 days.</p>
                </article>
                <article className="admin-card analytics-summary-card">
                  <span className="portal-kicker">M&amp;G Conversion</span>
                  <h3>{meetAndGreetConversionRate}%</h3>
                  <p>Households with a recent meet &amp; greet that later booked a stay.</p>
                </article>
                <article className="admin-card analytics-summary-card">
                  <span className="portal-kicker">Repeat Client Rate</span>
                  <h3>{repeatClientRate}%</h3>
                  <p>Active client households with more than one stay request in the last 30 days.</p>
                </article>
              </div>

              <div className="analytics-chart-shell">
                <div className="analytics-chart-header">
                  <div>
                    <strong>Bookings Created Per Day</strong>
                    <p className="section-copy" style={{ margin: "6px 0 0" }}>
                      Daily count of non-meet-and-greet booking requests created over the last 30 days.
                    </p>
                  </div>
                  <span className="analytics-chart-badge">Max {maxDailyBookings} / day</span>
                </div>

                <svg
                  className="analytics-chart"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  role="img"
                  aria-label="Line chart showing bookings created per day over the last 30 days"
                >
                  <line
                    x1={chartPaddingX}
                    y1={chartHeight - chartPaddingY}
                    x2={chartWidth - chartPaddingX}
                    y2={chartHeight - chartPaddingY}
                    className="analytics-axis-line"
                  />
                  <line
                    x1={chartPaddingX}
                    y1={chartPaddingY}
                    x2={chartPaddingX}
                    y2={chartHeight - chartPaddingY}
                    className="analytics-axis-line"
                  />
                  {[0.25, 0.5, 0.75].map((step) => {
                    const y = chartPaddingY + chartInnerHeight - chartInnerHeight * step;

                    return (
                      <line
                        key={step}
                        x1={chartPaddingX}
                        y1={y}
                        x2={chartWidth - chartPaddingX}
                        y2={y}
                        className="analytics-grid-line"
                      />
                    );
                  })}
                  <polyline className="analytics-line-fill" points={`${chartPaddingX},${chartHeight - chartPaddingY} ${bookingLinePoints} ${chartWidth - chartPaddingX},${chartHeight - chartPaddingY}`} />
                  <polyline className="analytics-line-path" points={bookingLinePoints} />
                  {bookingsPerDaySeries.map((item, index) => {
                    const x =
                      chartPaddingX +
                      (bookingsPerDaySeries.length === 1
                        ? 0
                        : (index / (bookingsPerDaySeries.length - 1)) * chartInnerWidth);
                    const y =
                      chartPaddingY +
                      chartInnerHeight -
                      (item.total / maxDailyBookings) * chartInnerHeight;

                    return (
                      <circle
                        key={item.dateKey}
                        className="analytics-point"
                        cx={x}
                        cy={y}
                        r="3.5"
                      />
                    );
                  })}
                </svg>

                <div className="analytics-axis-labels">
                  <span>{formatShortAxisLabel(analyticsDateKeys[0])}</span>
                  <span>Today</span>
                </div>
              </div>
            </section>

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
              <div className="portal-card-topline">
                <div>
                  <h2>Upcoming Meet &amp; Greets</h2>
                  <p className="admin-priority-note">
                    These intro appointments live in the booking system so you can track upcoming
                    meet &amp; greets in the same dashboard, without sending daily updates.
                  </p>
                </div>
                <Link className="button button-secondary" href="/admin/bookings">
                  Open Bookings
                </Link>
              </div>
              {upcomingMeetAndGreets.length === 0 ? (
                <p className="section-copy">
                  No upcoming meet &amp; greet requests are on the calendar right now.
                </p>
              ) : (
                <div className="admin-list">
                  {upcomingMeetAndGreets.map((booking) => (
                    <article className="admin-list-item" key={booking.id}>
                      <div className="portal-card-topline">
                        <strong>{getClientLabel(booking.household_id)}</strong>
                        <span className={`status-pill status-pill-${booking.status}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p>
                        <strong>{booking.pet_name || "Pet Booking"}</strong> | Meet &amp; Greet
                      </p>
                      <p>{booking.start_date}</p>
                      <p>Booking ID: {booking.id}</p>
                      <div className="portal-admin-cta">
                        <Link
                          className="button button-secondary"
                          href={`/admin/clients/${booking.household_id}?bookingId=${booking.id}#selected-stay-detail`}
                        >
                          Open Appointment
                        </Link>
                        <Link className="button button-secondary" href="/admin/bookings">
                          Open Booking Queue
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
