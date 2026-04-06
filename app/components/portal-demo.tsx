"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { isLikelyValidPhone, normalizePhoneForStorage } from "../../lib/phone";
import { supabase } from "../../lib/supabase";

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
  household_id: number;
  name: string;
  breed: string | null;
  age: string | null;
  vaccination_status: string | null;
  notes: string | null;
  photo_url: string | null;
};

type DailyUpdate = {
  id: number;
  household_id: number;
  booking_id: number;
  pet_id: number;
  booking_label: string | null;
  message: string;
  created_at: string;
};

type DailyUpdatePhoto = {
  id: number;
  daily_update_id: number;
  image_url: string;
  created_at: string;
};

type Booking = {
  id: number;
  household_id: number;
  pet_id: number | null;
  pet_name: string | null;
  service_type: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  drop_off_note: string | null;
  pick_up_note: string | null;
  special_instructions: string | null;
  created_at: string;
};

export function PortalDemo() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSavingHousehold, setIsSavingHousehold] = useState(false);
  const [isSavingPetId, setIsSavingPetId] = useState<number | null>(null);
  const [isDeletingPetId, setIsDeletingPetId] = useState<number | null>(null);
  const [editingPetId, setEditingPetId] = useState<number | null>(null);
  const [portalView, setPortalView] = useState<"home" | "pets" | "contact" | "updates">("home");
  const [sessionEmail, setSessionEmail] = useState("");
  const [sessionUserId, setSessionUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [dailyUpdatePhotos, setDailyUpdatePhotos] = useState<DailyUpdatePhoto[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function startEditingPet(petId: number) {
    clearMessages();
    setEditingPetId(petId);
  }

  function stopEditingPet() {
    setEditingPetId(null);
  }

  useEffect(() => {
    if (sessionEmail && profile?.role === "admin") {
      router.push("/admin");
    }
  }, [profile, router, sessionEmail]);

  useEffect(() => {
    async function loadProfile(userId: string) {
      const rpcResult = await supabase.rpc("get_my_profile");

      if (rpcResult.error) {
        const fallbackResult = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("user_id", userId)
          .maybeSingle();

        if (fallbackResult.error) {
          setErrorMessage(fallbackResult.error.message);
          setProfile(null);
          return;
        }

        setProfile((fallbackResult.data as Profile | null) ?? null);
        return;
      }

      const profileRow = Array.isArray(rpcResult.data)
        ? rpcResult.data[0]
        : rpcResult.data;

      if (profileRow) {
        setProfile(profileRow as Profile);
        return;
      }

      const fallbackResult = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("user_id", userId)
        .maybeSingle();

      if (fallbackResult.error) {
        setErrorMessage(fallbackResult.error.message);
        setProfile(null);
        return;
      }

      setProfile((fallbackResult.data as Profile | null) ?? null);
    }

    async function loadPortalData(userId: string) {
      const rpcResult = await supabase.rpc("get_my_household");
      const rpcRows = Array.isArray(rpcResult.data)
        ? rpcResult.data
        : rpcResult.data
          ? [rpcResult.data]
          : [];

      let currentHousehold = (rpcRows[0] as Household | undefined) ?? null;

      if (rpcResult.error) {
        const fallbackResult = await supabase
          .from("households")
          .select("id, owner_user_id, contact_email, contact_phone")
          .eq("owner_user_id", userId)
          .order("id", { ascending: true });

        if (fallbackResult.error) {
          setErrorMessage(fallbackResult.error.message);
          setHousehold(null);
          setPets([]);
          setBookings([]);
          setDailyUpdates([]);
          setDailyUpdatePhotos([]);
          return;
        }

        const fallbackRows = (fallbackResult.data as Household[] | null) ?? [];
        currentHousehold = fallbackRows[0] ?? null;
      }

      setHousehold(currentHousehold);

      if (!currentHousehold) {
        setPets([]);
        setBookings([]);
        setDailyUpdates([]);
        setDailyUpdatePhotos([]);
        return;
      }

      const petResult = await supabase
        .from("pets")
        .select("id, household_id, name, breed, age, vaccination_status, notes, photo_url")
        .eq("household_id", currentHousehold.id)
        .order("id", { ascending: false });

      if (petResult.error) {
        setErrorMessage(petResult.error.message);
        setPets([]);
        setBookings([]);
        setDailyUpdates([]);
        setDailyUpdatePhotos([]);
        return;
      }

      const petRows = (petResult.data as Pet[]) ?? [];
      setPets(petRows);

      const bookingResult = await supabase
        .from("bookings")
        .select(
          "id, household_id, pet_id, service_type, start_date, end_date, status, notes, drop_off_note, pick_up_note, special_instructions, created_at",
        )
        .eq("household_id", currentHousehold.id)
        .order("start_date", { ascending: true });

      if (bookingResult.error) {
        setErrorMessage(bookingResult.error.message);
        setBookings([]);
        setDailyUpdates([]);
        setDailyUpdatePhotos([]);
        return;
      }

      const bookingRows = ((bookingResult.data as Omit<Booking, "pet_name">[]) ?? []).map(
        (booking) => ({
          ...booking,
          pet_name: petRows.find((pet) => pet.id === booking.pet_id)?.name || null,
        }),
      );
      setBookings(bookingRows);

      const updateResult = await supabase
        .from("daily_updates")
        .select("id, household_id, booking_id, pet_id, message, created_at")
        .eq("household_id", currentHousehold.id)
        .order("created_at", { ascending: false });

      if (updateResult.error) {
        setErrorMessage(updateResult.error.message);
        setDailyUpdates([]);
        setDailyUpdatePhotos([]);
        return;
      }

      const updateRows = ((updateResult.data as Omit<DailyUpdate, "booking_label">[]) ?? []).map(
        (update) => {
          const matchingBooking = bookingRows.find((booking) => booking.id === update.booking_id);
          return {
            ...update,
            booking_label: matchingBooking
              ? `${matchingBooking.service_type} | ${matchingBooking.start_date}`
              : null,
          };
        },
      );
      setDailyUpdates(updateRows);

      if (updateRows.length === 0) {
        setDailyUpdatePhotos([]);
        return;
      }

      const updateIds = updateRows.map((update) => update.id);
      const photoResult = await supabase
        .from("daily_update_photos")
        .select("id, daily_update_id, image_url, created_at")
        .in("daily_update_id", updateIds)
        .order("id", { ascending: false });

      if (photoResult.error) {
        setErrorMessage(photoResult.error.message);
        setDailyUpdatePhotos([]);
        return;
      }

      setDailyUpdatePhotos((photoResult.data as DailyUpdatePhoto[]) ?? []);
    }

    async function syncSession() {
      setIsLoading(true);

      try {
        clearMessages();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        setSessionEmail(user?.email ?? "");
        setSessionUserId(user?.id ?? "");

        if (user?.id) {
          await loadProfile(user.id);
          await loadPortalData(user.id);
        } else {
          setProfile(null);
          setHousehold(null);
          setPets([]);
          setBookings([]);
          setDailyUpdates([]);
          setDailyUpdatePhotos([]);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load portal session.",
        );
        setProfile(null);
        setHousehold(null);
        setPets([]);
        setBookings([]);
        setDailyUpdates([]);
        setDailyUpdatePhotos([]);
      } finally {
        setIsLoading(false);
      }
    }

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoading(true);

      try {
        clearMessages();
        setSessionEmail(session?.user.email ?? "");
        setSessionUserId(session?.user.id ?? "");

        if (session?.user.id) {
          await loadProfile(session.user.id);
          await loadPortalData(session.user.id);
        } else {
          setProfile(null);
          setHousehold(null);
          setPets([]);
          setBookings([]);
          setDailyUpdates([]);
          setDailyUpdatePhotos([]);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to refresh portal session.",
        );
        setProfile(null);
        setHousehold(null);
        setPets([]);
        setBookings([]);
        setDailyUpdates([]);
        setDailyUpdatePhotos([]);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setIsSubmittingLogin(true);
    const form = event.currentTarget;

    const formData = new FormData(form);
    const email = String(formData.get("portalEmail") || "").trim();
    const password = String(formData.get("portalPassword") || "");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmittingLogin(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Welcome back. Your portal is ready.");
    form.reset();
  }

  async function handleLogout() {
    clearMessages();
    setSuccessMessage("You have been logged out.");
    setSessionEmail("");
    setSessionUserId("");
    setProfile(null);
    setHousehold(null);
    setPets([]);
    setBookings([]);
    setDailyUpdates([]);
    setDailyUpdatePhotos([]);
    await supabase.auth.signOut();
    router.refresh();
  }

  function getPetName(petId: number) {
    const pet = pets.find((currentPet) => currentPet.id === petId);
    return pet?.name || "Pet";
  }

  function getUpdatePhotos(dailyUpdateId: number) {
    return dailyUpdatePhotos.filter((photo) => photo.daily_update_id === dailyUpdateId);
  }

  function getUpdatePhotoLayout(photoCount: number) {
    if (photoCount <= 1) {
      return {
        gridTemplateColumns: "minmax(0, 280px)",
        maxWidth: "280px",
      };
    }

    if (photoCount === 2) {
      return {
        gridTemplateColumns: "repeat(2, minmax(0, 180px))",
        maxWidth: "380px",
      };
    }

    return {
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      maxWidth: "560px",
    };
  }

  function formatUpdateDate(value: string) {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatBookingDate(value: string) {
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatBookingWindow(startDate: string, endDate: string) {
    return `${formatBookingDate(startDate)} to ${formatBookingDate(endDate)}`;
  }

  function getBookingStatusSummary(status: string) {
    const labels: Record<string, string> = {
      pending: "Waiting for sitter approval",
      confirmed: "Confirmed and on the calendar",
      completed: "Completed stay",
      cancelled: "Cancelled request",
    };

    return labels[status] || "Booking updated";
  }

  function getBookingExtraDetails(booking: Booking) {
    return [
      { label: "Booking Notes", value: booking.notes },
      { label: "Drop-off", value: booking.drop_off_note },
      { label: "Pick-up", value: booking.pick_up_note },
      { label: "Special Instructions", value: booking.special_instructions },
    ].filter((item) => Boolean(item.value?.trim()));
  }

  function getBookingStatusGroups() {
    const labels: Record<string, string> = {
      pending: "Pending Approval",
      confirmed: "Confirmed Stays",
      completed: "Completed Stays",
      cancelled: "Cancelled Requests",
    };

    return ["pending", "confirmed", "completed", "cancelled"]
      .map((status) => ({
        status,
        label: labels[status],
        items: bookings.filter((booking) => booking.status === status),
      }))
      .filter((group) => group.items.length > 0);
  }

  function getDailyUpdateGroups() {
    const groups = new Map<
      string,
      { key: string; title: string; updates: DailyUpdate[] }
    >();

    dailyUpdates.forEach((update) => {
      const key = update.booking_label || `booking-${update.booking_id}`;
      const existing = groups.get(key);

      if (existing) {
        existing.updates.push(update);
        return;
      }

      groups.set(key, {
        key,
        title: update.booking_label || "Booking Update",
        updates: [update],
      });
    });

    return Array.from(groups.values());
  }

  function renderPortalUpdateCard(update: DailyUpdate) {
    return (
      <article
        className="portal-history-card"
        key={update.id}
        style={{
          border: "1px solid #eedcca",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,243,235,0.98) 100%)",
        }}
      >
        <div className="portal-card-topline">
          <span>{getPetName(update.pet_id)}</span>
          <span className="portal-update-time">{formatUpdateDate(update.created_at)}</span>
        </div>
        <strong>{update.booking_label || "Booking update"}</strong>
        <p
          style={{
            margin: "12px 0 14px",
            lineHeight: 1.75,
          }}
        >
          {update.message}
        </p>
        {(() => {
          const photos = getUpdatePhotos(update.id);
          const layout = getUpdatePhotoLayout(photos.length);

          return photos.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: layout.gridTemplateColumns,
                gap: "10px",
                marginTop: "12px",
                maxWidth: layout.maxWidth,
              }}
            >
              {photos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.image_url}
                  alt="Daily update"
                  style={{
                    width: "100%",
                    height: photos.length === 1 ? "180px" : "118px",
                    objectFit: "cover",
                    borderRadius: "18px",
                    boxShadow: "0 8px 20px rgba(125, 86, 46, 0.12)",
                  }}
                />
              ))}
            </div>
          ) : null;
        })()}
      </article>
    );
  }

  async function handleUpdatePet(event: FormEvent<HTMLFormElement>, petId: number) {
    event.preventDefault();
    clearMessages();
    setIsSavingPetId(petId);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("editPetName") || "").trim();
    const breed = String(formData.get("editBreed") || "").trim();
    const age = String(formData.get("editAge") || "").trim();
    const vaccinationStatus = String(formData.get("editVaccinationStatus") || "").trim();
    const notes = String(formData.get("editNotes") || "").trim();

    if (!name) {
      setIsSavingPetId(null);
      setErrorMessage("Please keep a pet name before saving changes.");
      return;
    }

    const { data, error } = await supabase
      .from("pets")
      .update({
        name,
        breed: breed || null,
        age: age || null,
        vaccination_status: vaccinationStatus || null,
        notes: notes || null,
      })
      .eq("id", petId)
      .select("id, household_id, name, breed, age, vaccination_status, notes, photo_url")
      .single();

    setIsSavingPetId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPets((current) =>
      current.map((pet) => (pet.id === petId ? (data as Pet) : pet)),
    );
    setSuccessMessage(`${name} was updated successfully.`);
    setEditingPetId(null);
  }

  async function handleDeletePet(petId: number, petName: string) {
    clearMessages();
    const confirmed = window.confirm(`Delete ${petName}'s pet profile?`);

    if (!confirmed) {
      return;
    }

    setIsDeletingPetId(petId);

    const { error } = await supabase.from("pets").delete().eq("id", petId);

    setIsDeletingPetId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPets((current) => current.filter((pet) => pet.id !== petId));
    setSuccessMessage(`${petName} was deleted successfully.`);

    if (editingPetId === petId) {
      setEditingPetId(null);
    }
  }

  async function handleUpdateMyContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (!household) {
      setErrorMessage("We have not found your household yet.");
      return;
    }

    setIsSavingHousehold(true);
    const formData = new FormData(event.currentTarget);
    const nextEmail = String(formData.get("contactEmail") || "").trim();
    const nextPhoneInput = String(formData.get("contactPhone") || "").trim();
    const nextPhone = nextPhoneInput ? normalizePhoneForStorage(nextPhoneInput) : "";

    if (nextPhoneInput && !isLikelyValidPhone(nextPhoneInput)) {
      setIsSavingHousehold(false);
      setErrorMessage("Please enter a valid mobile phone number.");
      return;
    }

    const { data, error } = await supabase
      .from("households")
      .update({
        contact_email: nextEmail || null,
        contact_phone: nextPhone || null,
      })
      .eq("id", household.id)
      .select("id, owner_user_id, contact_email, contact_phone")
      .single();

    setIsSavingHousehold(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setHousehold(data as Household);
    setSuccessMessage("Your contact details were updated successfully.");
  }

  const pendingBookings = bookings.filter((booking) => booking.status === "pending");
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const completedBookings = bookings.filter((booking) => booking.status === "completed");
  const nextConfirmedBooking = confirmedBookings
    .slice()
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? null;
  const recentDailyUpdates = dailyUpdates
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  if (sessionEmail) {
    if (profile?.role === "admin") {
      return (
        <section className="portal-dashboard">
          <p className="portal-loading-text">Redirecting to your admin dashboard...</p>
        </section>
      );
    }

    return (
      <section className="portal-dashboard">
        <div className="portal-topbar">
          <div>
            <span className="eyebrow">Pet Parent Portal</span>
            <h2 className="portal-pet-name">
              Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
            </h2>
            <p className="portal-subcopy">
              Manage your pets, request future stays, and check on updates from one place.
            </p>
          </div>
          <button className="button button-secondary" type="button" onClick={handleLogout}>
            Log Out
          </button>
        </div>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        {successMessage ? <p className="auth-success">{successMessage}</p> : null}

        <section className="portal-home-shell">
          <div className="portal-home-copy">
            <span className="portal-kicker">Portal Home</span>
            <h3 className="portal-home-title">Thank you for booking with us</h3>
            <p className="portal-subcopy portal-home-text">
              Keep this page simple: use the quick links to manage your account, and come back
              here for the newest stay updates.
            </p>
            {nextConfirmedBooking ? (
              <p className="portal-home-note">
                <strong>Next confirmed stay:</strong>{" "}
                {nextConfirmedBooking.pet_name || "Pet"} | {nextConfirmedBooking.service_type} |{" "}
                {formatBookingWindow(nextConfirmedBooking.start_date, nextConfirmedBooking.end_date)}
              </p>
            ) : null}
            {portalView !== "home" ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setPortalView("home")}
                style={{ width: "fit-content" }}
              >
                Back to portal home
              </button>
            ) : null}
          </div>

          <div className="portal-home-side">
            <div className="portal-welcome-statuses">
              <span className="status-pill status-pill-pending">{pendingBookings.length} pending</span>
              <span className="status-pill status-pill-confirmed">
                {confirmedBookings.length} confirmed
              </span>
              <span className="status-pill status-pill-completed">
                {completedBookings.length} completed
              </span>
            </div>
            <div className="portal-admin-cta portal-quick-links portal-home-links">
              <div>
                <strong>Quick Links</strong>
                <p className="portal-subcopy" style={{ margin: "6px 0 0" }}>
                  Jump straight to the section you need.
                </p>
              </div>
              <div className="portal-inline-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setPortalView("pets")}
                >
                  Pet Profiles
                </button>
                <Link className="button button-secondary" href="/portal/bookings/request">
                  Request Booking
                </Link>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setPortalView("contact")}
                >
                  Edit Contact Details
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setPortalView("updates")}
                >
                  Booking Updates
                </button>
              </div>
            </div>
          </div>
        </section>

        {!household && sessionUserId ? (
          <p className="portal-subcopy" style={{ marginTop: "16px" }}>
            We looked for a household tied to your signed-in user id: <strong>{sessionUserId}</strong>
          </p>
        ) : null}

        {portalView === "pets" ? (
          <section className="portal-history" id="pet-profiles">
          <div className="portal-card-topline">
            <div>
              <h3>Add or Update Pet Profiles</h3>
              <p className="portal-subcopy" style={{ margin: "10px 0 0" }}>
                Add a new pet profile or edit the ones you already have on file without leaving
                your portal home.
              </p>
            </div>
            <Link className="button button-secondary" href="/portal/pets/new">
              Add New Pet Profile
            </Link>
          </div>
          {pets.length === 0 ? (
            <p className="section-copy">
              No pet profiles yet. Use the button above to create your first one.
            </p>
          ) : (
            <div className="portal-history-grid">
              {pets.map((pet) => (
                <article className="portal-history-card" key={pet.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      marginBottom: "14px",
                    }}
                  >
                    {pet.photo_url ? (
                      <img
                        src={pet.photo_url}
                        alt={`${pet.name} profile`}
                        style={{
                          width: "72px",
                          height: "72px",
                          objectFit: "cover",
                          borderRadius: "999px",
                          border: "3px solid #f1dfcb",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "72px",
                          height: "72px",
                          borderRadius: "999px",
                          backgroundColor: "#f3e4d4",
                          color: "#8f5a28",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {pet.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span>Pet Profile</span>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "1.15rem",
                          marginTop: "4px",
                        }}
                      >
                        {pet.name}
                      </strong>
                    </div>
                  </div>

                  {editingPetId === pet.id ? (
                    <form onSubmit={(event) => void handleUpdatePet(event, pet.id)}>
                      <div className="field-grid auth-grid">
                        <div className="field field-full">
                          <label htmlFor={`editPetName-${pet.id}`}>Pet Name</label>
                          <input
                            type="text"
                            id={`editPetName-${pet.id}`}
                            name="editPetName"
                            defaultValue={pet.name}
                          />
                        </div>
                        <div className="field field-full">
                          <label htmlFor={`editBreed-${pet.id}`}>Breed</label>
                          <input
                            type="text"
                            id={`editBreed-${pet.id}`}
                            name="editBreed"
                            defaultValue={pet.breed || ""}
                          />
                        </div>
                        <div className="field field-full">
                          <label htmlFor={`editAge-${pet.id}`}>Age</label>
                          <input
                            type="text"
                            id={`editAge-${pet.id}`}
                            name="editAge"
                            defaultValue={pet.age || ""}
                          />
                        </div>
                        <div className="field field-full">
                          <label htmlFor={`editVaccinationStatus-${pet.id}`}>
                            Vaccination Status
                          </label>
                          <input
                            type="text"
                            id={`editVaccinationStatus-${pet.id}`}
                            name="editVaccinationStatus"
                            defaultValue={pet.vaccination_status || ""}
                          />
                        </div>
                        <div className="field field-full">
                          <label htmlFor={`editNotes-${pet.id}`}>Notes</label>
                          <textarea
                            id={`editNotes-${pet.id}`}
                            name="editNotes"
                            rows={4}
                            defaultValue={pet.notes || ""}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          flexWrap: "wrap",
                          marginTop: "16px",
                        }}
                      >
                        <button className="submit-button" type="submit" disabled={isSavingPetId === pet.id}>
                          {isSavingPetId === pet.id ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={stopEditingPet}
                          disabled={isSavingPetId === pet.id}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p>Breed: {pet.breed || "Not added yet"}</p>
                      <p>Age: {pet.age || "Not added yet"}</p>
                      <p>Vaccination: {pet.vaccination_status || "Not added yet"}</p>
                      <p>Notes: {pet.notes || "No notes yet"}</p>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          flexWrap: "wrap",
                          marginTop: "16px",
                        }}
                      >
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => startEditingPet(pet.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => void handleDeletePet(pet.id, pet.name)}
                          disabled={isDeletingPetId === pet.id}
                        >
                          {isDeletingPetId === pet.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
          </section>
        ) : null}

        {portalView === "contact" ? (
          <section className="portal-history" id="contact-details">
          <div className="portal-card-topline">
            <div>
              <h3>Edit Contact Details</h3>
              <p className="portal-subcopy" style={{ margin: "10px 0 0" }}>
                Keep your email and mobile phone current so booking requests and stay updates
                reach you quickly.
              </p>
            </div>
          </div>
          <form onSubmit={handleUpdateMyContact}>
            <div className="field-grid auth-grid">
              <div className="field field-full">
                <label htmlFor="contactEmail">Contact Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  defaultValue={household?.contact_email || sessionEmail}
                  placeholder="client@email.com"
                />
              </div>
              <div className="field field-full">
                <label htmlFor="contactPhone">Mobile Phone</label>
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  defaultValue={household?.contact_phone || ""}
                  placeholder="(530) 555-1234"
                />
              </div>
            </div>
            <button
              className="submit-button"
              type="submit"
              disabled={isSavingHousehold || !household}
            >
              {isSavingHousehold ? "Saving details..." : "Save Contact Details"}
            </button>
          </form>
          </section>
        ) : null}

        {portalView === "updates" ? (
          <section className="portal-history" id="daily-updates">
            <div className="portal-card-topline">
              <div>
                <h3>All Daily Updates</h3>
                <p className="portal-subcopy" style={{ margin: "10px 0 0" }}>
                  Every message and photo check-in tied to your stays appears here.
                </p>
              </div>
            </div>
            {dailyUpdates.length === 0 ? (
              <p className="section-copy">
                No daily updates yet. Once you are checked in, photos and messages from your
                sitter will appear here.
              </p>
            ) : (
              <div className="portal-status-stack">
                {getDailyUpdateGroups().map((group) => (
                  <section key={group.key} className="portal-status-group">
                    <div className="portal-status-heading">
                      <h4>{group.title}</h4>
                      <span>{group.updates.length}</span>
                    </div>
                    <div className="portal-history-grid">{group.updates.map(renderPortalUpdateCard)}</div>
                  </section>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {portalView === "home" ? (
          <section className="portal-history" id="daily-updates">
            <div className="portal-card-topline">
              <div>
                <h3>Most Recent Daily Updates</h3>
                <p className="portal-subcopy" style={{ margin: "10px 0 0" }}>
                  The newest photos and messages from recent stays will show up here first.
                </p>
              </div>
              {dailyUpdates.length > 3 ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setPortalView("updates")}
                >
                  View All Updates
                </button>
              ) : null}
            </div>
            {recentDailyUpdates.length === 0 ? (
              <p className="section-copy">
                No daily updates yet. Once you are checked in, photos and messages from your
                sitter will appear here.
              </p>
            ) : (
              <div className="portal-history-grid">
                {recentDailyUpdates.map(renderPortalUpdateCard)}
              </div>
            )}
          </section>
        ) : null}

      </section>
    );
  }

  return (
    <section className="portal-access">
      <div className="portal-access-copy">
        <span className="eyebrow">Secure Access</span>
        <h2 className="portal-pet-name">Log in to your portal account</h2>
        <p className="portal-subcopy">
          Your portal now uses a normal account flow. Sign in if you already have
          an account, or open the separate Create Account page to register as a
          new pet parent.
        </p>
        {isLoading ? <p className="portal-loading-text">Checking your portal session...</p> : null}
        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        {successMessage ? <p className="auth-success">{successMessage}</p> : null}
      </div>

      <div className="portal-auth-shell">
        <form className="form-card portal-form" onSubmit={handleLogin}>
          <h3>Log In</h3>
          <div className="field-grid auth-grid">
            <div className="field field-full">
              <label htmlFor="portalEmail">Email</label>
              <input type="email" id="portalEmail" name="portalEmail" required />
            </div>
            <div className="field field-full">
              <label htmlFor="portalPassword">Password</label>
              <input
                type="password"
                id="portalPassword"
                name="portalPassword"
                minLength={6}
                required
              />
            </div>
          </div>
          <button className="submit-button" type="submit" disabled={isSubmittingLogin}>
            {isSubmittingLogin ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="form-card portal-form portal-register-card">
          <h3>Need a new account?</h3>
          <p className="portal-subcopy">
            Start with a dedicated registration page so clients can follow a more
            familiar sign-up flow with phone number and password confirmation.
          </p>
          <ul className="portal-list">
            <li>Enter full name, email, and mobile phone number.</li>
            <li>Create and confirm your password.</li>
            <li>Return to the login page after email confirmation if needed.</li>
          </ul>
          <Link className="submit-button portal-inline-link" href="/register">
            Create Account
          </Link>
        </div>
      </div>
    </section>
  );
}
