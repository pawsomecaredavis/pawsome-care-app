"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SiteShell } from "../../../components/site-shell";
import { uploadPetPhoto } from "../../../../lib/pet-photos";
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

export default function PortalNewPetPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
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

      setHousehold((householdRows[0] as Household | undefined) ?? null);
      setIsLoading(false);
    }

    void loadPage();
  }, [router]);

  async function handleCreatePet(event: FormEvent<HTMLFormElement>) {
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
    const name = String(formData.get("petName") || "").trim();
    const breed = String(formData.get("breed") || "").trim();
    const age = String(formData.get("age") || "").trim();
    const vaccinationStatus = String(formData.get("vaccinationStatus") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const petPhoto = formData.get("petPhoto");

    if (!name) {
      setIsSubmitting(false);
      setErrorMessage("Please enter your pet's name before submitting.");
      return;
    }

    if (!(petPhoto instanceof File) || petPhoto.size === 0) {
      setIsSubmitting(false);
      setErrorMessage("Please upload one pet photo before creating the profile.");
      return;
    }

    let photoUrl = "";

    try {
      photoUrl = await uploadPetPhoto(petPhoto, household.id, name);
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to upload the pet photo.",
      );
      return;
    }

    const { error } = await supabase.from("pets").insert({
      household_id: household.id,
      name,
      breed: breed || null,
      age: age || null,
      vaccination_status: vaccinationStatus || null,
      notes: notes || null,
      photo_url: photoUrl,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(`${name} was added successfully.`);
    form.reset();
  }

  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card portal-page">
            <span className="eyebrow">Pet Parent Portal</span>
            <h1 className="section-title">Add Pet Profile</h1>
            <p className="section-copy">
              Create a pet profile on its own page so the main portal stays simple and easy
              to use.
            </p>

            <div className="portal-admin-cta">
              <Link className="button button-secondary" href="/portal">
                Back to Portal
              </Link>
            </div>

            {isLoading ? <p className="portal-loading-text">Loading your pet form...</p> : null}
            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
            {successMessage ? <p className="auth-success">{successMessage}</p> : null}

            <div className="portal-task-layout">
              <section className="form-card admin-form-card">
                <p className="portal-subcopy">
                  Household: <strong>{household ? `#${household.id}` : "Not found yet"}</strong>
                </p>
                <p className="portal-subcopy">
                  A pet photo is required. After saving, you can go back to the portal to edit
                  or review the pet profile.
                </p>
                <p className="portal-subcopy">
                  Photos are automatically resized and compressed before upload so the portal loads
                  faster.
                </p>
                <form className="portal-form" onSubmit={handleCreatePet} noValidate>
                  <div className="field-grid auth-grid">
                    <div className="field field-full">
                      <label htmlFor="petName">Pet Name</label>
                      <input type="text" id="petName" name="petName" />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="breed">Breed</label>
                      <input type="text" id="breed" name="breed" />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="age">Age</label>
                      <input type="text" id="age" name="age" />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="vaccinationStatus">Vaccination Status</label>
                      <input type="text" id="vaccinationStatus" name="vaccinationStatus" />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="notes">Notes</label>
                      <textarea id="notes" name="notes" rows={4} />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="petPhoto">Pet Photo</label>
                      <input type="file" id="petPhoto" name="petPhoto" accept="image/*" required />
                    </div>
                  </div>
                  <button
                    className="submit-button"
                    type="submit"
                    disabled={isSubmitting || isLoading || !household || profile?.role === "admin"}
                  >
                    {isSubmitting ? "Uploading photo and creating profile..." : "Create Pet Profile"}
                  </button>
                </form>
              </section>

              <aside className="helper-card portal-workflow-card">
                <span className="portal-action-kicker">Pet Setup</span>
                <h2>What happens next</h2>
                <p>
                  Once this pet is saved, it will show up in your main portal under
                  <strong> Edit My Pets</strong>.
                </p>
                <p>
                  After that, you can request a stay for this pet from the booking page.
                </p>
                <div className="portal-mini-steps">
                  <span>1. Add photo and profile</span>
                  <span>2. Return to portal</span>
                  <span>3. Request a booking</span>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
