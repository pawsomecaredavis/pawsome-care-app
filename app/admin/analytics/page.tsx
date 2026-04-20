"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteShell } from "../../components/site-shell";
import {
  type Booking,
  getAdminBookingsForHouseholds,
  getAuthenticatedAdmin,
  getClientHouseholds,
} from "../admin-data";
import { supabase } from "../../../lib/supabase";

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

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadAnalyticsPage() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { user } = await getAuthenticatedAdmin();
        const clientHouseholds = await getClientHouseholds(user.id);
        const allBookings = await getAdminBookingsForHouseholds(clientHouseholds);

        setBookings(allBookings);
        setIsLoading(false);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load admin analytics.",
        );
        setIsLoading(false);
      }
    }

    void loadAnalyticsPage();
  }, []);

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
            <span className="eyebrow">Admin Analytics</span>
            <h1 className="section-title">30-day booking trends</h1>
            <p className="section-copy">
              Use this page when you want the reporting view. The main dashboard now stays focused
              on today&apos;s work only.
            </p>

            <div className="portal-admin-cta">
              <Link className="button button-secondary" href="/admin">
                Back to Dashboard
              </Link>
              <Link className="button button-secondary" href="/admin/bookings">
                Open Bookings
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
            {isLoading ? <p className="portal-loading-text">Loading analytics...</p> : null}

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
                  <polyline
                    className="analytics-line-fill"
                    points={`${chartPaddingX},${chartHeight - chartPaddingY} ${bookingLinePoints} ${chartWidth - chartPaddingX},${chartHeight - chartPaddingY}`}
                  />
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
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
