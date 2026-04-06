"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { uploadPetPhoto } from "../../../lib/pet-photos";
import { SiteShell } from "../../components/site-shell";
import {
  type Household,
  type Pet,
  getAdminPets,
  getAuthenticatedAdmin,
  getClientHouseholds,
  getHouseholdLabel,
} from "../admin-data";
import { supabase } from "../../../lib/supabase";

export default function AdminPetsPage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadPetsPage() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { user } = await getAuthenticatedAdmin();
        setHouseholds(await getClientHouseholds(user.id));
        setPets(await getAdminPets());
        setIsLoading(false);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load admin pets.");
        setIsLoading(false);
      }
    }

    void loadPetsPage();
  }, []);

  function getClientLabel(householdId: number) {
    const household = households.find((item) => item.id === householdId);

    if (!household) {
      return `Household #${householdId}`;
    }

    return getHouseholdLabel(household);
  }

  async function handleCreatePet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const householdId = Number(formData.get("householdId"));
    const petName = String(formData.get("petName") || "").trim();
    const breed = String(formData.get("breed") || "").trim();
    const age = String(formData.get("age") || "").trim();
    const vaccinationStatus = String(formData.get("vaccinationStatus") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const photoEntry = formData.get("petPhoto");

    if (!householdId) {
      setIsSubmitting(false);
      setErrorMessage("Please choose a client household before creating a pet.");
      return;
    }

    if (!petName) {
      setIsSubmitting(false);
      setErrorMessage("Please enter the pet's name.");
      return;
    }

    if (!(photoEntry instanceof File) || photoEntry.size === 0) {
      setIsSubmitting(false);
      setErrorMessage("Please upload one pet photo before creating the profile.");
      return;
    }

    let photoUrl = "";

    try {
      photoUrl = await uploadPetPhoto(photoEntry, householdId, petName);
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload the pet photo.");
      return;
    }

    const { data, error } = await supabase.rpc("admin_create_pet", {
      target_household_id: householdId,
      pet_name: petName,
      pet_breed: breed || null,
      pet_age: age || null,
      pet_vaccination_status: vaccinationStatus || null,
      pet_notes: notes || null,
      pet_photo_url: photoUrl,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const createdPet = Array.isArray(data) ? data[0] : data;

    if (!createdPet) {
      setErrorMessage("The pet was created, but we could not read the profile back.");
      return;
    }

    setPets((current) => [createdPet as Pet, ...current]);
    setSuccessMessage(`${petName} was added successfully.`);
    form.reset();
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
            <span className="eyebrow">Admin Pets</span>
            <h1 className="section-title">Pet profiles</h1>
            <p className="section-copy">
              This section is for reviewing all pet records and helping a client add a pet
              profile when they need support. The dashboard home stays lighter, and pet work
              lives here instead.
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
            {isLoading ? <p className="portal-loading-text">Loading pet directory...</p> : null}

            <div className="admin-grid">
              <article className="admin-card">
                <span className="portal-kicker">Pets</span>
                <h3>{pets.length}</h3>
                <p>This is the total number of pet profiles currently in the system.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Clients</span>
                <h3>{households.length}</h3>
                <p>Use the household selector to attach each new pet to the right client.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Photo Rule</span>
                <h3>Required</h3>
                <p>Every new pet profile needs one photo so records stay easy to recognize.</p>
              </article>
            </div>

            <section className="admin-list-card">
              <h2>Existing Pets</h2>
              {pets.length === 0 ? (
                <p className="section-copy">
                  No pets are on file yet. Once a client or admin creates the first pet, it
                  will show up here.
                </p>
              ) : (
                <div className="admin-list">
                  {pets.map((pet) => (
                    <article className="admin-list-item" key={pet.id}>
                      {pet.photo_url ? (
                        <img
                          src={pet.photo_url}
                          alt={`${pet.name} profile`}
                          style={{
                            width: "72px",
                            height: "72px",
                            objectFit: "cover",
                            borderRadius: "999px",
                            marginBottom: "12px",
                            border: "3px solid #f1dfcb",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "72px",
                            height: "72px",
                            display: "grid",
                            placeItems: "center",
                            marginBottom: "12px",
                            borderRadius: "999px",
                            background: "#f8e4d1",
                            color: "#8b4e28",
                            fontWeight: 700,
                          }}
                        >
                          {pet.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="portal-card-topline">
                        <strong>{pet.name}</strong>
                        <span className="status-pill status-pill-confirmed">
                          {getClientLabel(pet.household_id)}
                        </span>
                      </div>
                      <p>Breed: {pet.breed || "Not added yet"}</p>
                      <p>Age: {pet.age || "Not added yet"}</p>
                      <p>Vaccination: {pet.vaccination_status || "Not added yet"}</p>
                      <p>Notes: {pet.notes || "No notes yet"}</p>
                      <Link
                        className="button button-secondary"
                        href={`/admin/clients/${pet.household_id}`}
                      >
                        Open Client Profile
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="admin-workspace">
              <section className="form-card admin-form-card">
                <h2>Create Pet</h2>
                <p className="section-copy">
                  Use this when you are helping a client and need to create the pet profile
                  from the admin side. Pet parents can still create pets from their own portal too.
                </p>
                <p className="section-copy">
                  Pet photos are automatically resized and compressed before upload so records load
                  faster.
                </p>

                <form onSubmit={handleCreatePet}>
                  <div className="field-grid admin-field-grid">
                    <div className="field field-full">
                      <label htmlFor="householdId">Client Household</label>
                      <select
                        id="householdId"
                        name="householdId"
                        className="admin-select"
                        required
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select a client household
                        </option>
                        {households.map((household) => (
                          <option key={household.id} value={household.id}>
                            {getHouseholdLabel(household)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field field-full">
                      <label htmlFor="petName">Pet Name</label>
                      <input id="petName" name="petName" required />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="breed">Breed</label>
                      <input id="breed" name="breed" />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="age">Age</label>
                      <input id="age" name="age" />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="vaccinationStatus">Vaccination Status</label>
                      <input id="vaccinationStatus" name="vaccinationStatus" />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="notes">Notes</label>
                      <textarea id="notes" name="notes" rows={4} />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="petPhoto">Pet Photo</label>
                      <input
                        type="file"
                        id="petPhoto"
                        name="petPhoto"
                        accept="image/*"
                        required
                      />
                    </div>
                  </div>

                  <button
                    className="submit-button"
                    type="submit"
                    disabled={isSubmitting || isLoading || households.length === 0}
                  >
                    {isSubmitting ? "Uploading photo and creating profile..." : "Create Pet"}
                  </button>
                </form>
              </section>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
