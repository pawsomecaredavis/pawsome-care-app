"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteShell } from "../components/site-shell";
import {
  type Booking,
  type DailyUpdate,
  type DailyUpdatePhoto,
  type Household,
  type Pet,
  type Profile,
  getAdminDailyUpdatePhotosForHouseholds,
  getAdminDailyUpdatesForHouseholds,
  getAdminBookingsForHouseholds,
  getAdminPets,
  getAuthenticatedAdmin,
  getClientHouseholds,
  getHouseholdLabel,
} from "./admin-data";
import { supabase } from "../../lib/supabase";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(date);
}

function formatServiceLabel(serviceType: string) {
  if (serviceType === "meet-and-greet") {
    return "Meet & Greet";
  }

  return serviceType
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatFriendlyDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getGreetingName(household?: Household) {
  if (household?.client_name?.trim()) {
    return household.client_name.trim();
  }

  if (household?.contact_email?.trim()) {
    return household.contact_email.trim().split("@")[0];
  }

  return "there";
}

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [dailyUpdatePhotos, setDailyUpdatePhotos] = useState<DailyUpdatePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedClientPdfIds, setSavedClientPdfIds] = useState<number[]>([]);
  const [openedEmailDraftIds, setOpenedEmailDraftIds] = useState<number[]>([]);

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
        const allDailyUpdatePhotos = await getAdminDailyUpdatePhotosForHouseholds(clientHouseholds);

        setHouseholds(clientHouseholds);
        setPets(allPets);
        setBookings(allBookings);
        setDailyUpdates(allDailyUpdates);
        setDailyUpdatePhotos(allDailyUpdatePhotos);
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
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(new Date());
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
  const activeTodayBookings = confirmedBookings.filter(
    (booking) => booking.start_date <= today && booking.end_date >= today,
  );
  const bookingsNeedingFirstUpdate = confirmedBookings.filter(
    (booking) => !updateCountByBookingId[booking.id],
  );
  const currentBookings = confirmedBookings.slice(0, 4);
  const todaysDailyUpdates = dailyUpdates
    .filter((update) => formatDayKey(new Date(update.created_at)) === today)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const todaysClientEmailMap = new Map<
    number,
    {
      household: Household | undefined;
      email: string;
      bookings: Booking[];
      primaryBooking: Booking;
    }
  >();

  activeTodayBookings.forEach((booking) => {
    const household = households.find((item) => item.id === booking.household_id);
    const email = household?.contact_email?.trim() || "";

    if (!email) {
      return;
    }

    const existing = todaysClientEmailMap.get(booking.household_id);

    if (existing) {
      existing.bookings.push(booking);
      existing.bookings.sort((a, b) => a.start_date.localeCompare(b.start_date));
      existing.primaryBooking = existing.bookings[0];
      return;
    }

    todaysClientEmailMap.set(booking.household_id, {
      household,
      email,
      bookings: [booking],
      primaryBooking: booking,
    });
  });

  const todaysClientEmails = Array.from(todaysClientEmailMap.entries())
    .map(([householdId, value]) => ({
      householdId,
      household: value.household,
      email: value.email,
      bookings: value.bookings,
      primaryBooking: value.primaryBooking,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
  const todaysUpdateHouseholdIds = new Set(todaysDailyUpdates.map((update) => update.household_id));
  const todaysSendReadyClients = todaysClientEmails.filter(({ householdId }) =>
    todaysUpdateHouseholdIds.has(householdId),
  );
  const todaysWaitingOnUpdateClients = todaysClientEmails.filter(
    ({ householdId }) => !todaysUpdateHouseholdIds.has(householdId),
  );
  const todaysUpdatesPublishedCount = todaysDailyUpdates.length;
  const nextAdminActions = [
    {
      step: "Step 1",
      title: "Review requests",
      countLabel:
        pendingBookings.length > 0
          ? `${pendingBookings.length} pending`
          : upcomingMeetAndGreets.length > 0
            ? `${upcomingMeetAndGreets.length} upcoming M&G`
            : "Clear",
      note:
        pendingBookings.length > 0
          ? "Start with approvals so the rest of the day stays settled."
          : upcomingMeetAndGreets.length > 0
            ? "No pending stays are waiting, but intro appointments are still coming up."
            : "No requests are waiting on you right now.",
      href: "/admin/bookings",
      cta: pendingBookings.length > 0 ? "Open Pending Queue" : "Open Bookings",
    },
    {
      step: "Step 2",
      title: "Publish today’s updates",
      countLabel:
        bookingsNeedingFirstUpdate.length > 0
          ? `${bookingsNeedingFirstUpdate.length} first updates`
          : activeTodayBookings.length > 0
            ? `${activeTodayBookings.length} active stays`
            : "No stays today",
      note:
        bookingsNeedingFirstUpdate.length > 0
          ? "These stays are confirmed but still have no client-facing update."
          : activeTodayBookings.length > 0
            ? "Today’s stays already have at least one published update."
            : "No confirmed stays are active today.",
      href:
        bookingsNeedingFirstUpdate.length > 0
          ? `/admin/clients/${bookingsNeedingFirstUpdate[0]?.household_id}?bookingId=${bookingsNeedingFirstUpdate[0]?.id}#publish-daily-update`
          : "/admin/bookings",
      cta:
        bookingsNeedingFirstUpdate.length > 0
          ? "Open First Update"
          : activeTodayBookings.length > 0
            ? "Review Today’s Stays"
            : "Open Bookings",
    },
    {
      step: "Step 3",
      title: "Send client updates",
      countLabel:
        todaysSendReadyClients.length > 0
          ? `${todaysSendReadyClients.length} ready`
          : todaysWaitingOnUpdateClients.length > 0
            ? `${todaysWaitingOnUpdateClients.length} waiting`
            : "No emails today",
      note:
        todaysSendReadyClients.length > 0
          ? "These clients already have a PDF-ready update you can send manually."
          : todaysWaitingOnUpdateClients.length > 0
            ? "Client emails are available, but the update still needs to be published first."
            : "No active confirmed stays with contact emails are on deck today.",
      href: "#todays-client-emails",
      cta:
        todaysSendReadyClients.length > 0
          ? "Open Send List"
          : todaysWaitingOnUpdateClients.length > 0
            ? "See Waiting Clients"
            : "View Email List",
    },
  ];

  function handleSaveClientUpdatesAsPdf(householdId: number) {
    if (typeof window === "undefined") {
      return;
    }

    const clientHousehold = households.find((item) => item.id === householdId);
    const clientUpdates = todaysDailyUpdates.filter((update) => update.household_id === householdId);
    const clientBookings = activeTodayBookings.filter((booking) => booking.household_id === householdId);
    const printWindow = window.open("", "_blank", "width=960,height=720");

    if (!printWindow) {
      setErrorMessage("Unable to open the print window for PDF export.");
      return;
    }

    const updateMarkup =
      clientUpdates.length === 0
        ? `<p>No daily updates have been published yet for ${escapeHtml(
            clientHousehold?.client_name || clientHousehold?.contact_email || `Household #${householdId}`,
          )} on ${escapeHtml(today)}.</p>`
        : clientUpdates
            .map((update) => {
              const household = households.find((item) => item.id === update.household_id);
              const updatePhotos = dailyUpdatePhotos.filter(
                (photo) => photo.daily_update_id === update.id,
              );
              return `
                <article style="padding:18px 0;border-top:1px solid #eadfd4;">
                  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8f5a28;">
                    ${escapeHtml(new Date(update.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }))}
                  </p>
                  <h2 style="margin:0 0 8px;font-size:22px;color:#241814;">
                    ${escapeHtml(update.pet_name || "Pet Update")}
                  </h2>
                  <p style="margin:0 0 8px;color:#5d493e;">
                    ${escapeHtml(household?.client_name || household?.contact_email || `Household #${update.household_id}`)}
                  </p>
                  <p style="margin:0 0 8px;color:#5d493e;">
                    ${escapeHtml(update.booking_label || "Booking update")}
                  </p>
                  <div style="padding:16px 18px;background:#fff8ef;border-radius:16px;border:1px solid rgba(184,102,44,0.14);line-height:1.8;color:#241814;">
                    ${escapeHtml(update.message)}
                  </div>
                  ${
                    updatePhotos.length > 0
                      ? `
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:14px;">
                          ${updatePhotos
                            .map(
                              (photo) => `
                                <img
                                  src="${escapeHtml(photo.image_url)}"
                                  alt="Daily update photo"
                                  style="width:100%;height:180px;object-fit:cover;border-radius:16px;display:block;"
                                />
                              `,
                            )
                            .join("")}
                        </div>
                      `
                      : ""
                  }
                </article>
              `;
            })
            .join("");

    const bookingMarkup =
      clientBookings.length === 0
        ? "<p>No active confirmed stays are tied to this client today.</p>"
        : clientBookings
            .map(
              (booking) => `
                <li style="margin-bottom:10px;">
                  <strong>${escapeHtml(booking.pet_name || "Pet")}</strong>
                  <span style="display:block;color:#7b6b5f;">
                    ${escapeHtml(booking.service_type)} | ${escapeHtml(
                      `${booking.start_date} to ${booking.end_date}`,
                    )}
                  </span>
                </li>
              `,
            )
            .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>${escapeHtml(
            clientHousehold?.client_name || clientHousehold?.contact_email || `Client ${householdId}`,
          )} Daily Updates ${escapeHtml(today)}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #241814; background: #fffdf9; }
            h1, h2, h3 { margin: 0; }
            .sheet { max-width: 760px; margin: 0 auto; }
            .card { border: 1px solid #eadfd4; border-radius: 24px; padding: 24px; margin-top: 24px; }
            ul { padding-left: 20px; margin: 16px 0 0; }
            @media print {
              body { padding: 0; }
              .card { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1 style="font-size:34px;">Pawsome Care Client Update</h1>
            <p style="margin:10px 0 0;color:#5d493e;">
              ${escapeHtml(clientHousehold?.client_name || clientHousehold?.contact_email || `Household #${householdId}`)}
            </p>
            <p style="margin:8px 0 0;color:#7b6b5f;">Exported for ${escapeHtml(today)}</p>

            <section class="card">
              <h2 style="font-size:24px;">Today&apos;s Booking Summary</h2>
              <ul>${bookingMarkup}</ul>
            </section>

            <section class="card">
              <h2 style="font-size:24px;">Today&apos;s Published Updates</h2>
              ${updateMarkup}
            </section>
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setSavedClientPdfIds((current) =>
      current.includes(householdId) ? current : [...current, householdId],
    );
  }

  function getClientMailtoHref(householdId: number) {
    const client = todaysClientEmails.find((item) => item.householdId === householdId);

    if (!client) {
      return "";
    }

    const petNames = Array.from(
      new Set(client.bookings.map((booking) => booking.pet_name || "your pet")),
    );
    const petLabel =
      petNames.length === 1 ? petNames[0] : `${petNames.length} pets`;
    const subject = `Pawsome Care update for ${petLabel} - ${formatFriendlyDate(today)}`;
    const body = [
      `Hi ${getGreetingName(client.household)},`,
      "",
      `Here is today’s update for ${petLabel}.`,
      "",
      "I attached the latest stay update PDF with photos and notes from today.",
      "",
      "Please let me know if you have any questions.",
      "",
      "Best,",
      "Pawsome Care",
    ].join("\n");

    return `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function handleOpenClientEmailDraft(householdId: number) {
    const href = getClientMailtoHref(householdId);

    if (!href) {
      setErrorMessage("We could not prepare the email draft for this client.");
      return;
    }

    if (typeof window !== "undefined") {
      window.location.href = href;
    }

    setOpenedEmailDraftIds((current) =>
      current.includes(householdId) ? current : [...current, householdId],
    );
  }

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
              <Link className="admin-card admin-card-link" href="/admin/bookings">
                <span className="portal-kicker">Pending</span>
                <h3>{pendingBookings.length}</h3>
                <p>These booking requests are currently waiting for admin approval.</p>
              </Link>
              <Link
                className="admin-card admin-card-link"
                href={
                  bookingsNeedingFirstUpdate.length > 0
                    ? `/admin/clients/${bookingsNeedingFirstUpdate[0]?.household_id}?bookingId=${bookingsNeedingFirstUpdate[0]?.id}#publish-daily-update`
                    : "/admin/bookings"
                }
              >
                <span className="portal-kicker">Needs First Update</span>
                <h3>{bookingsNeedingFirstUpdate.length}</h3>
                <p>Confirmed stays with no daily update published yet show here first.</p>
              </Link>
              <Link className="admin-card admin-card-link" href="/admin/bookings">
                <span className="portal-kicker">Upcoming M&amp;Gs</span>
                <h3>{upcomingMeetAndGreets.length}</h3>
                <p>Meet &amp; greets stay visible here as upcoming admin tasks.</p>
              </Link>
              <Link className="admin-card admin-card-link" href="#todays-client-emails">
                <span className="portal-kicker">Ready to Send</span>
                <h3>{todaysSendReadyClients.length}</h3>
                <p>These clients already have today&apos;s updates published and ready to send.</p>
              </Link>
            </div>

            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
            {isLoading ? <p className="portal-loading-text">Loading admin data...</p> : null}

            <section className="admin-list-card admin-workflow-card">
              <div className="portal-card-topline">
                <div>
                  <h2>Today&apos;s Workflow</h2>
                  <p className="admin-priority-note">
                    Work through the day in this order so approvals, updates, and manual send-outs
                    stay in one clean loop.
                  </p>
                </div>
                <span className="status-pill status-pill-confirmed">{today}</span>
              </div>

              <div className="admin-workflow-steps">
                {nextAdminActions.map((action) => (
                  <article className="admin-workflow-step" key={action.title}>
                    <span className="portal-kicker">{action.step}</span>
                    <div className="admin-workflow-step-header">
                      <h3>{action.title}</h3>
                      <span className="status-pill status-pill-attention">{action.countLabel}</span>
                    </div>
                    <p>{action.note}</p>
                    <Link className="button button-secondary" href={action.href}>
                      {action.cta}
                    </Link>
                  </article>
                ))}
              </div>

              <div className="admin-workflow-summary-grid">
                <article className="admin-workflow-summary-card">
                  <span className="portal-kicker">Today&apos;s Active Stays</span>
                  <h3>{activeTodayBookings.length}</h3>
                  <p>
                    Confirmed bookings happening today. This is the core list to publish and send
                    updates from.
                  </p>
                </article>
                <article className="admin-workflow-summary-card">
                  <span className="portal-kicker">Updates Published Today</span>
                  <h3>{todaysUpdatesPublishedCount}</h3>
                  <p>
                    Daily updates published on {today}. Once a client moves into the ready list,
                    you can export and send.
                  </p>
                </article>
                <article className="admin-workflow-summary-card">
                  <span className="portal-kicker">Waiting on Today&apos;s Update</span>
                  <h3>{todaysWaitingOnUpdateClients.length}</h3>
                  <p>
                    Clients with active stays and email on file, but no update published yet today.
                  </p>
                </article>
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
                        <strong>{booking.pet_name || "Pet Booking"}</strong> | {formatServiceLabel(booking.service_type)}
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

            <div className="admin-workspace admin-lists-grid">
              <section className="admin-list-card" id="todays-client-emails">
                <div className="portal-card-topline">
                  <div>
                    <h2>Today&apos;s Client Emails</h2>
                    <p className="admin-priority-note">
                      Active confirmed stays for {today}. Save the client PDF only after the stay moves into Ready to Send.
                    </p>
                  </div>
                </div>
                {todaysClientEmails.length === 0 ? (
                  <p className="section-copy">
                    No contact emails are tied to active confirmed stays today.
                  </p>
                ) : (
                  <div className="portal-status-stack">
                    <section className="portal-status-group">
                      <div className="portal-status-heading">
                        <h4>Ready to Send</h4>
                        <span>{todaysSendReadyClients.length}</span>
                      </div>
                      {todaysSendReadyClients.length === 0 ? (
                        <p className="section-copy">
                          No client has a published update ready for manual send yet.
                        </p>
                      ) : (
                        <div className="admin-list">
                          {todaysSendReadyClients.map(({ householdId, primaryBooking, household, email, bookings }) => (
                            <article
                              className="admin-list-item admin-send-ready-item"
                              key={`today-email-ready-${householdId}`}
                            >
                              <div className="portal-card-topline">
                                <strong>{household?.client_name || email}</strong>
                                <span className="status-pill status-pill-confirmed">ready</span>
                              </div>
                              <p>{email}</p>
                              <p>
                                {bookings.length === 1
                                  ? `${primaryBooking.pet_name || "Pet"} | ${formatServiceLabel(primaryBooking.service_type)}`
                                  : `${bookings.length} active stays today`}
                              </p>
                              <p>{primaryBooking.start_date} to {primaryBooking.end_date}</p>
                              <div className="admin-send-status-row">
                                <span
                                  className={`status-pill ${savedClientPdfIds.includes(householdId) ? "status-pill-confirmed" : "status-pill-attention"}`}
                                >
                                  {savedClientPdfIds.includes(householdId) ? "pdf saved" : "pdf not saved"}
                                </span>
                                <span
                                  className={`status-pill ${openedEmailDraftIds.includes(householdId) ? "status-pill-confirmed" : "status-pill-pending"}`}
                                >
                                  {openedEmailDraftIds.includes(householdId) ? "draft opened" : "draft not opened"}
                                </span>
                              </div>
                              <div className="portal-admin-cta">
                                <button
                                  className="button button-primary"
                                  type="button"
                                  onClick={() => handleSaveClientUpdatesAsPdf(householdId)}
                                >
                                  Save Client PDF
                                </button>
                                <button
                                  className="button button-secondary"
                                  type="button"
                                  onClick={() => handleOpenClientEmailDraft(householdId)}
                                >
                                  Open Email Draft
                                </button>
                                <Link
                                  className="button button-secondary"
                                  href={`/admin/clients/${householdId}?bookingId=${primaryBooking.id}#selected-stay-detail`}
                                >
                                  Open Stay Detail
                                </Link>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="portal-status-group">
                      <div className="portal-status-heading">
                        <h4>Waiting on Today&apos;s Update</h4>
                        <span>{todaysWaitingOnUpdateClients.length}</span>
                      </div>
                      {todaysWaitingOnUpdateClients.length === 0 ? (
                        <p className="section-copy">
                          Every client with an active stay and email on file already has a published update today.
                        </p>
                      ) : (
                        <div className="admin-list">
                          {todaysWaitingOnUpdateClients.map(({ householdId, primaryBooking, household, email, bookings }) => (
                            <article className="admin-list-item" key={`today-email-waiting-${householdId}`}>
                              <div className="portal-card-topline">
                                <strong>{household?.client_name || email}</strong>
                                <span className="status-pill status-pill-attention">publish first</span>
                              </div>
                              <p>{email}</p>
                              <p>
                                {bookings.length === 1
                                  ? `${primaryBooking.pet_name || "Pet"} | ${formatServiceLabel(primaryBooking.service_type)}`
                                  : `${bookings.length} active stays today`}
                              </p>
                              <p>{primaryBooking.start_date} to {primaryBooking.end_date}</p>
                              <div className="portal-admin-cta">
                                <Link
                                  className="button button-primary"
                                  href={`/admin/clients/${householdId}?bookingId=${primaryBooking.id}#publish-daily-update`}
                                >
                                  Publish Update
                                </Link>
                                <Link
                                  className="button button-secondary"
                                  href={`/admin/clients/${householdId}?bookingId=${primaryBooking.id}#selected-stay-detail`}
                                >
                                  Open Stay Detail
                                </Link>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </section>
            </div>

            <section className="admin-list-card">
              <div className="portal-card-topline">
                <div>
                  <h2>Quick Links</h2>
                  <p className="admin-priority-note">
                    Use these when you need the full section, not just today&apos;s focused tasks.
                  </p>
                </div>
              </div>
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
                <Link className="portal-action-card portal-action-card-secondary" href="/admin/analytics">
                  <span className="portal-action-kicker">Trends</span>
                  <strong>Analytics</strong>
                  <p>Open the separate 30-day reporting view for bookings, conversions, and repeat clients.</p>
                  <span className="portal-action-link">Open Analytics</span>
                </Link>
              </div>
            </section>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
