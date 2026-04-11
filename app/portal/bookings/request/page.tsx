"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SiteShell } from "../../../components/site-shell";
import {
  type AvailabilityDayStatus,
  AvailabilityMonth,
  buildAvailabilityMonths,
  getAvailableDates,
  getAvailabilityLastUpdated,
  getAvailabilityWindow,
  getContiguousAvailableDates,
  isRangeAvailable,
} from "../../../../lib/availability";
import { getCurrentProfile, getIsFirstTimeClient } from "../../../../lib/profile";
import { supabase } from "../../../../lib/supabase";

type Profile = {
  full_name: string | null;
  role: "admin" | "parent";
};

type Household = {
  id: number;
  owner_user_id: string;
  contact_email: string | null;
  contact_phone: string | null;
};

type Pet = {
  id: number;
  name: string;
};

type ExistingBooking = {
  id: number;
  service_type: string;
};

export default function PortalRequestBookingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityDayStatus[]>([]);
  const [availabilityMonths, setAvailabilityMonths] = useState<AvailabilityMonth[]>([]);
  const [availabilityUpdated, setAvailabilityUpdated] = useState("recently");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isFirstTimeClient, setIsFirstTimeClient] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState("boarding");
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const now = useMemo(() => new Date(), []);
  const availabilityWindow = useMemo(() => getAvailabilityWindow(4, now), [now]);
  const isMeetAndGreetRequest = selectedServiceType === "meet-and-greet";
  const hasMeetAndGreetRequest = useMemo(
    () => existingBookings.some((booking) => booking.service_type === "meet-and-greet"),
    [existingBookings],
  );
  const mustBookMeetAndGreet = isFirstTimeClient && !hasMeetAndGreetRequest;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedService = params.get("service");

    if (requestedService === "meet-and-greet") {
      setSelectedServiceType("meet-and-greet");
    }
  }, []);

  useEffect(() => {
    async function loadPage() {
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(userError?.message || "Please log in first.");
        setIsLoading(false);
        return;
      }

      setIsFirstTimeClient(getIsFirstTimeClient(user));

      let currentProfile: Profile | null = null;

      try {
        currentProfile = await getCurrentProfile(user.id);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load your profile.",
        );
        setIsLoading(false);
        return;
      }

      setProfile(currentProfile);

      if (currentProfile.role === "admin") {
        router.push("/admin");
        return;
      }

      const householdResult = await supabase.rpc("get_my_household");
      const householdRows = Array.isArray(householdResult.data)
        ? householdResult.data
        : householdResult.data
          ? [householdResult.data]
          : [];

      if (householdResult.error) {
        setErrorMessage(householdResult.error.message);
        setIsLoading(false);
        return;
      }

      const currentHousehold = (householdRows[0] as Household | undefined) ?? null;
      setHousehold(currentHousehold);

      if (!currentHousehold) {
        setIsLoading(false);
        return;
      }

      const petResult = await supabase
        .from("pets")
        .select("id, name")
        .eq("household_id", currentHousehold.id)
        .order("name", { ascending: true });

      if (petResult.error) {
        setErrorMessage(petResult.error.message);
        setIsLoading(false);
        return;
      }

      setPets((petResult.data as Pet[]) ?? []);

      const bookingResult = await supabase
        .from("bookings")
        .select("id, service_type")
        .eq("household_id", currentHousehold.id);

      if (bookingResult.error) {
        setErrorMessage(bookingResult.error.message);
        setIsLoading(false);
        return;
      }

      setExistingBookings((bookingResult.data as ExistingBooking[]) ?? []);

      try {
        const { data, error } = await supabase.rpc("get_public_availability", {
          start_date: availabilityWindow.startDate,
          end_date: availabilityWindow.endDate,
        });

        if (error) {
          throw error;
        }

        const rows = (data as AvailabilityDayStatus[]) ?? [];
        setAvailabilityRows(rows);
        setAvailabilityMonths(buildAvailabilityMonths(rows, 4, now));
        setAvailabilityUpdated(getAvailabilityLastUpdated(rows));
      } catch {
        setAvailabilityUpdated("unavailable right now");
      }

      setIsLoading(false);
    }

    void loadPage();
  }, [availabilityWindow.endDate, availabilityWindow.startDate, now, router]);

  const availableStartDates = useMemo(
    () =>
      getAvailableDates(
        availabilityRows,
        availabilityWindow.startDate,
        availabilityWindow.endDate,
        now,
      ),
    [availabilityRows, availabilityWindow.endDate, availabilityWindow.startDate, now],
  );

  const availableEndDates = useMemo(() => {
    if (!selectedStartDate) {
      return [];
    }

    return getContiguousAvailableDates(
      availabilityRows,
      selectedStartDate,
      availabilityWindow.endDate,
      now,
    );
  }, [availabilityRows, availabilityWindow.endDate, now, selectedStartDate]);

  useEffect(() => {
    setSelectedStartDate((current) =>
      current && availableStartDates.includes(current) ? current : "",
    );
  }, [availableStartDates]);

  useEffect(() => {
    if (mustBookMeetAndGreet) {
      setSelectedServiceType("meet-and-greet");
    }
  }, [mustBookMeetAndGreet]);

  useEffect(() => {
    if (!selectedStartDate) {
      setSelectedEndDate("");
      return;
    }

    setSelectedEndDate((current) => {
      if (current && availableEndDates.includes(current)) {
        return current;
      }

      return availableEndDates[0] ?? "";
    });
  }, [availableEndDates, selectedStartDate]);

  function formatBookingDate(dateString: string) {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async function handleRequestBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!household) {
      setErrorMessage("We could not find your household yet.");
      return;
    }

    setIsSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const rawPetId = String(formData.get("requestPetId") || "").trim();
    const petId = rawPetId ? Number(rawPetId) : null;
    const serviceType = selectedServiceType.trim();
    const startDate = selectedStartDate.trim();
    const endDate = (isMeetAndGreetRequest ? selectedStartDate : selectedEndDate).trim();
    const notes = String(formData.get("requestNotes") || "").trim();
    const dropOffNote = String(formData.get("requestDropOffNote") || "").trim();
    const pickUpNote = String(formData.get("requestPickUpNote") || "").trim();
    const specialInstructions = String(
      formData.get("requestSpecialInstructions") || "",
    ).trim();

    if (mustBookMeetAndGreet && serviceType !== "meet-and-greet") {
      setIsSubmitting(false);
      setErrorMessage(
        "First-time clients need to request their meet & greet before booking daycare or boarding.",
      );
      return;
    }

    if (!isMeetAndGreetRequest && !petId) {
      setIsSubmitting(false);
      setErrorMessage("Please choose which pet this booking request is for.");
      return;
    }

    if (!serviceType || !startDate || !endDate) {
      setIsSubmitting(false);
      setErrorMessage(
        isMeetAndGreetRequest
          ? "Please complete the meet & greet date."
          : "Please complete the service type and booking dates.",
      );
      return;
    }

    if (availabilityMonths.length > 0 && !isRangeAvailable(availabilityMonths, startDate, endDate)) {
      setIsSubmitting(false);
      setErrorMessage(
        "That date range includes one or more unavailable days. Please choose available dates from the calendar below.",
      );
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      household_id: household.id,
      pet_id: isMeetAndGreetRequest ? petId : petId,
      service_type: serviceType,
      start_date: startDate,
      end_date: endDate,
      status: "pending",
      notes: notes || null,
      drop_off_note: dropOffNote || null,
      pick_up_note: pickUpNote || null,
      special_instructions: specialInstructions || null,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      isMeetAndGreetRequest
        ? "Meet & greet request submitted. We will review it and follow up with you soon."
        : "Booking request submitted. It is now waiting for admin approval.",
    );
    form.reset();
    setSelectedServiceType(isMeetAndGreetRequest ? "meet-and-greet" : "boarding");
    setSelectedStartDate("");
    setSelectedEndDate("");
    setExistingBookings((current) => [
      ...current,
      { id: Date.now(), service_type: serviceType },
    ]);
  }

  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card portal-page">
            <span className="eyebrow">Pet Parent Portal</span>
            <h1 className="section-title">Request Booking</h1>
            <p className="section-copy">
              {mustBookMeetAndGreet
                ? "Because you signed up as a first-time client, please request your meet and greet here before booking daycare or boarding."
                : isMeetAndGreetRequest
                ? "Submit your meet & greet request here, and it will show up in the admin dashboard as an upcoming appointment."
                : "Submit a booking request here, and your sitter will review it in the admin dashboard before confirming it."}
            </p>

            <div className="portal-admin-cta">
              <Link className="button button-secondary" href="/portal">
                Back to Portal
              </Link>
            </div>

            {isLoading ? <p className="portal-loading-text">Loading your booking form...</p> : null}
            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
            {successMessage ? <p className="auth-success">{successMessage}</p> : null}
            {mustBookMeetAndGreet ? (
              <p className="portal-subcopy" style={{ marginTop: "6px" }}>
                First-time clients start with a meet and greet. After that request is on file,
                you can come back here for daycare or boarding.
              </p>
            ) : null}

            <div className="portal-task-layout">
              <section className="form-card admin-form-card">
                <p className="portal-subcopy">
                  Household: <strong>{household ? `#${household.id}` : "Not found yet"}</strong>
                </p>
                <p className="portal-subcopy">
                  New requests start as <strong>pending</strong> until your sitter confirms them.
                </p>
                <p className="portal-subcopy">
                  {isMeetAndGreetRequest
                    ? "Meet & greet requests use a single appointment date, do not require a pet profile first, and will appear as upcoming admin tasks without the daily update workflow."
                    : "Start and end dates now stay linked to the live availability calendar below, so only currently open dates can be selected."}
                </p>
                <form className="portal-form" onSubmit={handleRequestBooking}>
                  <div className="field-grid auth-grid">
                    <div className="field field-full">
                      <label htmlFor="requestPetId">
                        {isMeetAndGreetRequest ? "Pet (Optional for Meet & Greet)" : "Pet"}
                      </label>
                      <select
                        id="requestPetId"
                        name="requestPetId"
                        className="admin-select"
                        defaultValue=""
                        required={!isMeetAndGreetRequest}
                      >
                        <option value="">
                          {isMeetAndGreetRequest
                            ? pets.length === 0
                              ? "No pet profile added yet"
                              : "No pet profile selected"
                            : "Select a pet"}
                        </option>
                        {pets.map((pet) => (
                          <option key={pet.id} value={pet.id}>
                            {pet.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field field-full">
                      <label htmlFor="requestServiceType">Service Type</label>
                      <select
                        id="requestServiceType"
                        name="requestServiceType"
                        className="admin-select"
                        value={selectedServiceType}
                        onChange={(event) => setSelectedServiceType(event.target.value)}
                        required
                        disabled={mustBookMeetAndGreet}
                      >
                        {mustBookMeetAndGreet ? (
                          <option value="meet-and-greet">Meet &amp; Greet</option>
                        ) : (
                          <>
                            <option value="boarding">Boarding</option>
                            <option value="daycare">Daycare</option>
                            <option value="meet-and-greet">Meet &amp; Greet</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="field field-full">
                      <label htmlFor="requestStartDate">
                        {isMeetAndGreetRequest ? "Meet & Greet Date" : "Start Date"}
                      </label>
                      <select
                        id="requestStartDate"
                        name="requestStartDate"
                        className="admin-select"
                        value={selectedStartDate}
                        onChange={(event) => setSelectedStartDate(event.target.value)}
                        required
                      >
                        <option value="" disabled>
                          {isMeetAndGreetRequest
                            ? "Select an available meet & greet date"
                            : "Select an available start date"}
                        </option>
                        {availableStartDates.map((date) => (
                          <option key={date} value={date}>
                            {formatBookingDate(date)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!isMeetAndGreetRequest ? (
                      <div className="field field-full">
                        <label htmlFor="requestEndDate">End Date</label>
                        <select
                          id="requestEndDate"
                          name="requestEndDate"
                          className="admin-select"
                          value={selectedEndDate}
                          onChange={(event) => setSelectedEndDate(event.target.value)}
                          required
                          disabled={!selectedStartDate || availableEndDates.length === 0}
                        >
                          <option value="" disabled>
                            {selectedStartDate
                              ? "Select an available end date"
                              : "Choose a start date first"}
                          </option>
                          {availableEndDates.map((date) => (
                            <option key={date} value={date}>
                              {formatBookingDate(date)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <div className="field field-full">
                      <label htmlFor="requestNotes">
                        {isMeetAndGreetRequest ? "Meet & Greet Notes" : "Booking Notes"}
                      </label>
                      <textarea id="requestNotes" name="requestNotes" rows={4} />
                    </div>
                    {!isMeetAndGreetRequest ? (
                      <>
                        <div className="field field-full">
                          <label htmlFor="requestDropOffNote">Drop-Off Note</label>
                          <textarea id="requestDropOffNote" name="requestDropOffNote" rows={3} />
                        </div>
                        <div className="field field-full">
                          <label htmlFor="requestPickUpNote">Pick-Up Note</label>
                          <textarea id="requestPickUpNote" name="requestPickUpNote" rows={3} />
                        </div>
                      </>
                    ) : null}
                    <div className="field field-full">
                      <label htmlFor="requestSpecialInstructions">
                        {isMeetAndGreetRequest ? "Questions or Special Notes" : "Special Instructions"}
                      </label>
                      <textarea
                        id="requestSpecialInstructions"
                        name="requestSpecialInstructions"
                        rows={4}
                      />
                    </div>
                  </div>
                  {!isMeetAndGreetRequest && pets.length === 0 ? (
                    <p className="portal-subcopy" style={{ marginTop: "16px" }}>
                      Requesting daycare or boarding requires at least one pet profile first.{" "}
                      <Link href="/portal/pets/new">Add your pet profile here</Link>.
                    </p>
                  ) : null}
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={
                      isSubmitting ||
                      isLoading ||
                      !household ||
                      profile?.role === "admin" ||
                      availableStartDates.length === 0 ||
                      (!isMeetAndGreetRequest && pets.length === 0)
                    }
                  >
                    {isSubmitting
                      ? isMeetAndGreetRequest
                        ? "Submitting meet & greet request..."
                        : "Submitting booking request..."
                      : isMeetAndGreetRequest
                        ? "Request Meet & Greet"
                        : "Request Booking"}
                  </button>
                </form>
              </section>

              <aside className="helper-card portal-workflow-card">
                <span className="portal-action-kicker">Booking Flow</span>
                <h2>What happens next</h2>
                <p>
                  After you submit, your request appears in the admin dashboard as
                  <strong> pending</strong>.
                </p>
                <p>
                  {isMeetAndGreetRequest
                    ? "We will review your meet and greet request and follow up with you about the next step."
                    : "Once approved, the same booking will show up in your portal with the updated status."}
                </p>
                <div className="portal-mini-steps">
                  <span>
                    {isMeetAndGreetRequest ? "1. Choose a date" : "1. Choose pet and available dates"}
                  </span>
                  <span>2. Submit request</span>
                  <span>{isMeetAndGreetRequest ? "3. Wait for follow-up" : "3. Wait for approval"}</span>
                </div>
                {selectedStartDate ? (
                  <p style={{ marginTop: "18px", color: "#7c4724", fontWeight: 600 }}>
                    {availableEndDates.length > 0
                      ? `You can currently book from ${formatBookingDate(selectedStartDate)} through ${formatBookingDate(availableEndDates[availableEndDates.length - 1])} without crossing a blocked date.`
                      : "That start date no longer has an open booking range."}
                  </p>
                ) : null}
              </aside>
            </div>

            <section className="availability-card portal-availability-card">
              <div className="availability-head">
                <span className="eyebrow">Availability Check</span>
                <div className="availability-toolbar">
                  <h3>Open dates for new requests</h3>
                </div>
              </div>
              <div className="availability-legend">
                <span>
                  <i className="availability-swatch availability-swatch-open" />
                  Available
                </span>
                <span>
                  <i className="availability-swatch availability-swatch-closed" />
                  Not available
                </span>
              </div>
              <div className="portal-mini-steps" style={{ marginTop: "18px" }}>
                {availabilityMonths.map((month) => (
                  <span key={month.label}>
                    {month.label}: {month.available.length} open day{month.available.length === 1 ? "" : "s"}
                  </span>
                ))}
              </div>
              {availabilityRows.some((row) => Boolean(row.note?.trim()) && row.is_available === false) ? (
                <div className="admin-list" style={{ marginTop: "18px" }}>
                  {availabilityRows
                    .filter((row) => Boolean(row.note?.trim()) && row.is_available === false)
                    .slice(0, 6)
                    .map((row) => (
                      <article className="admin-list-item" key={`booking-note-${row.date}`}>
                        <strong>{row.date}</strong>
                        <p>{row.note}</p>
                      </article>
                    ))}
                </div>
              ) : null}
              <div className="availability-updated">
                <span className="availability-check">&#10003;</span>
                <span>Calendar last updated {availabilityUpdated}</span>
              </div>
            </section>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
