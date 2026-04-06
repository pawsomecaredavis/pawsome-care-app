"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SiteShell } from "../../../components/site-shell";
import {
  type AvailabilityDayStatus,
  AvailabilityMonth,
  buildAvailabilityMonths,
  getAvailabilityLastUpdated,
  getAvailabilityWindow,
  isRangeAvailable,
} from "../../../../lib/availability";
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

export default function PortalRequestBookingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityDayStatus[]>([]);
  const [availabilityMonths, setAvailabilityMonths] = useState<AvailabilityMonth[]>([]);
  const [availabilityUpdated, setAvailabilityUpdated] = useState("recently");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

      const profileResult = await supabase.rpc("get_my_profile");
      const profileRow = Array.isArray(profileResult.data)
        ? profileResult.data[0]
        : profileResult.data;

      if (profileResult.error || !profileRow) {
        setErrorMessage(profileResult.error?.message || "Unable to load your profile.");
        setIsLoading(false);
        return;
      }

      const currentProfile = profileRow as Profile;
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
        setAvailabilityRows(rows);
        setAvailabilityMonths(buildAvailabilityMonths(rows, 4));
        setAvailabilityUpdated(getAvailabilityLastUpdated(rows));
      } catch {
        setAvailabilityUpdated("unavailable right now");
      }

      setIsLoading(false);
    }

    void loadPage();
  }, [router]);

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
    const petId = Number(formData.get("requestPetId"));
    const serviceType = String(formData.get("requestServiceType") || "").trim();
    const startDate = String(formData.get("requestStartDate") || "").trim();
    const endDate = String(formData.get("requestEndDate") || "").trim();
    const notes = String(formData.get("requestNotes") || "").trim();
    const dropOffNote = String(formData.get("requestDropOffNote") || "").trim();
    const pickUpNote = String(formData.get("requestPickUpNote") || "").trim();
    const specialInstructions = String(
      formData.get("requestSpecialInstructions") || "",
    ).trim();

    if (!petId) {
      setIsSubmitting(false);
      setErrorMessage("Please choose which pet this booking request is for.");
      return;
    }

    if (!serviceType || !startDate || !endDate) {
      setIsSubmitting(false);
      setErrorMessage("Please complete the service type and booking dates.");
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
      pet_id: petId,
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

    setSuccessMessage("Booking request submitted. It is now waiting for admin approval.");
    form.reset();
  }

  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card portal-page">
            <span className="eyebrow">Pet Parent Portal</span>
            <h1 className="section-title">Request Booking</h1>
            <p className="section-copy">
              Submit a booking request here, and your sitter will review it in the admin
              dashboard before confirming it.
            </p>

            <div className="portal-admin-cta">
              <Link className="button button-secondary" href="/portal">
                Back to Portal
              </Link>
            </div>

            {isLoading ? <p className="portal-loading-text">Loading your booking form...</p> : null}
            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
            {successMessage ? <p className="auth-success">{successMessage}</p> : null}

            <div className="portal-task-layout">
              <section className="form-card admin-form-card">
                <p className="portal-subcopy">
                  Household: <strong>{household ? `#${household.id}` : "Not found yet"}</strong>
                </p>
                <p className="portal-subcopy">
                  New requests start as <strong>pending</strong> until your sitter confirms them.
                </p>
                <form className="portal-form" onSubmit={handleRequestBooking}>
                  <div className="field-grid auth-grid">
                    <div className="field field-full">
                      <label htmlFor="requestPetId">Pet</label>
                      <select
                        id="requestPetId"
                        name="requestPetId"
                        className="admin-select"
                        defaultValue=""
                        required
                      >
                        <option value="" disabled>
                          Select a pet
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
                        defaultValue="boarding"
                        required
                      >
                        <option value="boarding">Boarding</option>
                        <option value="daycare">Daycare</option>
                        <option value="meet-and-greet">Meet &amp; Greet</option>
                      </select>
                    </div>
                    <div className="field field-full">
                      <label htmlFor="requestStartDate">Start Date</label>
                      <input type="date" id="requestStartDate" name="requestStartDate" required />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="requestEndDate">End Date</label>
                      <input type="date" id="requestEndDate" name="requestEndDate" required />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="requestNotes">Booking Notes</label>
                      <textarea id="requestNotes" name="requestNotes" rows={4} />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="requestDropOffNote">Drop-Off Note</label>
                      <textarea id="requestDropOffNote" name="requestDropOffNote" rows={3} />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="requestPickUpNote">Pick-Up Note</label>
                      <textarea id="requestPickUpNote" name="requestPickUpNote" rows={3} />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="requestSpecialInstructions">Special Instructions</label>
                      <textarea
                        id="requestSpecialInstructions"
                        name="requestSpecialInstructions"
                        rows={4}
                      />
                    </div>
                  </div>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={
                      isSubmitting || isLoading || !household || pets.length === 0 || profile?.role === "admin"
                    }
                  >
                    {isSubmitting ? "Submitting booking request..." : "Request Booking"}
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
                  Once approved, the same booking will show up in your portal with the updated
                  status.
                </p>
                <div className="portal-mini-steps">
                  <span>1. Choose pet and dates</span>
                  <span>2. Submit request</span>
                  <span>3. Wait for approval</span>
                </div>
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
