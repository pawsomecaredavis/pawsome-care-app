"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteShell } from "../../components/site-shell";
import {
  type Household,
  type Pet,
  type Profile,
  getAdminPets,
  getAuthenticatedAdmin,
  getClientHouseholds,
  getHouseholdLabel,
} from "../admin-data";
import { supabase } from "../../../lib/supabase";

export default function AdminHouseholdsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadHouseholds() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { user, profile: currentProfile } = await getAuthenticatedAdmin();
        setProfile(currentProfile);
        setHouseholds(await getClientHouseholds(user.id));
        setPets(await getAdminPets());
        setIsLoading(false);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load the household directory.",
        );
        setIsLoading(false);
      }
    }

    void loadHouseholds();
  }, []);

  function getPetCount(householdId: number) {
    return pets.filter((pet) => pet.household_id === householdId).length;
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
            <span className="eyebrow">Admin Households</span>
            <h1 className="section-title">Household directory</h1>
            <p className="section-copy">
              This section keeps the client directory out of the dashboard home. Use it to
              review contact information, see which households already have pets, and jump
              into the right client profile when you need to work.
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
            {isLoading ? <p className="portal-loading-text">Loading household directory...</p> : null}

            <div className="admin-grid">
              <article className="admin-card">
                <span className="portal-kicker">Admin</span>
                <h3>{profile?.full_name || "Admin"}</h3>
                <p>Role: <strong>{profile?.role || "unknown"}</strong></p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Households</span>
                <h3>{households.length}</h3>
                <p>These are the pet parent households currently visible to the admin view.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">With Email</span>
                <h3>{households.filter((household) => household.contact_email).length}</h3>
                <p>These household records already have a contact email on file.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">With Pets</span>
                <h3>{households.filter((household) => getPetCount(household.id) > 0).length}</h3>
                <p>These households already have at least one pet profile attached.</p>
              </article>
            </div>

            <section className="admin-list-card">
              <h2>All Households</h2>
              {households.length === 0 ? (
                <p className="section-copy">
                  No client households are showing yet. New parent registrations will begin
                  appearing here as soon as they have an account.
                </p>
              ) : (
                <div className="admin-list">
                  {households.map((household) => (
                    <article className="admin-list-item" key={household.id}>
                      <div className="portal-card-topline">
                        <strong>{getHouseholdLabel(household)}</strong>
                        <span className="status-pill status-pill-confirmed">
                          {getPetCount(household.id)} pet{getPetCount(household.id) === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p>Household ID: {household.id}</p>
                      <p>Email: {household.contact_email || "No email yet"}</p>
                      <p>Phone: {household.contact_phone || "No phone yet"}</p>
                      <Link
                        className="button button-primary"
                        href={`/admin/clients/${household.id}`}
                      >
                        Open Client Profile
                      </Link>
                    </article>
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
