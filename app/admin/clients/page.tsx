"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function AdminClientsPage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadClients() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { user } = await getAuthenticatedAdmin();
        setHouseholds(await getClientHouseholds(user.id));
        setPets(await getAdminPets());
        setIsLoading(false);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load client profiles.");
        setIsLoading(false);
      }
    }

    void loadClients();
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
            <span className="eyebrow">Admin Clients</span>
            <h1 className="section-title">Open a client profile</h1>
            <p className="section-copy">
              This is the first version of your client list. From here you can open a
              household profile and manage its pet records in one place.
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
            {isLoading ? <p className="portal-loading-text">Loading client profiles...</p> : null}

            <div className="admin-grid">
              <article className="admin-card">
                <span className="portal-kicker">Client Profiles</span>
                <h3>{households.length}</h3>
                <p>This is how many client records are currently visible in this admin view.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Pets</span>
                <h3>{pets.length}</h3>
                <p>Each client profile will show the pets currently attached to that household.</p>
              </article>
            </div>

            <section className="admin-list-card">
              <h2>Client Profiles</h2>
              {households.length === 0 ? (
                <p className="section-copy">
                  No client households are showing yet. Create one in the admin dashboard first.
                </p>
              ) : (
                <div className="admin-list">
                  {households.map((household) => (
                    <article className="admin-list-item" key={household.id}>
                        <strong>{getHouseholdLabel(household)}</strong>
                        <p>Household ID: {household.id}</p>
                        <p>Email: {household.contact_email || "No email yet"}</p>
                        <p>Phone: {household.contact_phone || "No phone yet"}</p>
                      <p>Pets on file: {getPetCount(household.id)}</p>
                      <Link className="button button-primary" href={`/admin/clients/${household.id}`}>
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
