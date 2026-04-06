"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { uploadDailyUpdatePhotos } from "../../../../lib/daily-update-photos";
import { getCurrentProfile, type Profile } from "../../../../lib/profile";
import { SiteShell } from "../../../components/site-shell";
import { supabase } from "../../../../lib/supabase";

type Household = {
  id: number;
  owner_user_id: string;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  client_name?: string | null;
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

type DailyUpdate = {
  id: number;
  household_id: number;
  booking_id: number;
  pet_id: number;
  pet_name: string | null;
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

export default function AdminClientProfilePage({
  params,
}: {
  params: Promise<{ householdId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [dailyUpdatePhotos, setDailyUpdatePhotos] = useState<DailyUpdatePhoto[]>([]);
  const [householdId, setHouseholdId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [isSavingHousehold, setIsSavingHousehold] = useState(false);
  const [isSavingUpdateId, setIsSavingUpdateId] = useState<number | null>(null);
  const [isRemovingUpdatePhotoId, setIsRemovingUpdatePhotoId] = useState<number | null>(null);
  const [isUpdatingBookingId, setIsUpdatingBookingId] = useState<number | null>(null);
  const [editingUpdateId, setEditingUpdateId] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedUpdateBookingId, setSelectedUpdateBookingId] = useState("");

  useEffect(() => {
    async function loadClientProfile() {
      setIsLoading(true);
      setErrorMessage("");

      const resolvedParams = await params;
      const currentHouseholdId = Number(resolvedParams.householdId);
      setHouseholdId(currentHouseholdId);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(userError?.message || "You need to log in first.");
        setIsLoading(false);
        return;
      }

      let currentProfile: Profile;

      try {
        currentProfile = await getCurrentProfile(user.id);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load your admin profile.",
        );
        setIsLoading(false);
        return;
      }

      setProfile(currentProfile);

      if (currentProfile.role !== "admin") {
        setErrorMessage("This page is only for admin accounts.");
        setIsLoading(false);
        return;
      }

      const householdResult = await supabase
        .rpc("get_admin_household_by_id", {
          target_household_id: currentHouseholdId,
        });

      if (householdResult.error) {
        setErrorMessage(householdResult.error.message);
        setIsLoading(false);
        return;
      }

      const householdRows = Array.isArray(householdResult.data)
        ? householdResult.data
        : householdResult.data
          ? [householdResult.data]
          : [];
      const householdRow = (householdRows[0] as Household | undefined) ?? null;

      if (!householdRow) {
        setErrorMessage("We could not find that client household.");
        setIsLoading(false);
        return;
      }

      setHousehold(householdRow);

      const petResult = await supabase
        .rpc("get_admin_pets_for_household", {
          target_household_id: currentHouseholdId,
        });

      if (petResult.error) {
        setErrorMessage(petResult.error.message);
        setIsLoading(false);
        return;
      }

      setPets((petResult.data as Pet[]) ?? []);

      const bookingResult = await supabase
        .rpc("get_admin_bookings_for_household", {
          target_household_id: currentHouseholdId,
        });

      if (bookingResult.error) {
        setErrorMessage(bookingResult.error.message);
        setIsLoading(false);
        return;
      }

      setBookings((bookingResult.data as Booking[]) ?? []);

      const updateResult = await supabase.rpc("get_admin_daily_updates_for_household", {
        target_household_id: currentHouseholdId,
      });

      if (updateResult.error) {
        setErrorMessage(updateResult.error.message);
        setIsLoading(false);
        return;
      }

      setDailyUpdates((updateResult.data as DailyUpdate[]) ?? []);

      const updatePhotoResult = await supabase.rpc(
        "get_admin_daily_update_photos_for_household",
        {
          target_household_id: currentHouseholdId,
        },
      );

      if (updatePhotoResult.error) {
        setErrorMessage(updatePhotoResult.error.message);
        setIsLoading(false);
        return;
      }

      setDailyUpdatePhotos((updatePhotoResult.data as DailyUpdatePhoto[]) ?? []);
      setIsLoading(false);
    }

    void loadClientProfile();
  }, [params]);

  function getClientLabel() {
    if (household?.client_name?.trim()) {
      return household.client_name;
    }

    if (household?.contact_email?.trim()) {
      return household.contact_email;
    }

    if (householdId) {
      return `Client Household #${householdId}`;
    }

    return "Client Profile";
  }

  function getBookingGroups() {
    const labels: Record<string, string> = {
      pending: "Pending Queue",
      confirmed: "Confirmed Stays",
      completed: "Completed Stays",
      cancelled: "Cancelled",
    };

    return ["pending", "confirmed", "completed", "cancelled"]
      .map((status) => ({
        status,
        label: labels[status],
        items: bookings.filter((booking) => booking.status === status),
      }))
      .filter((group) => group.items.length > 0);
  }

  async function handleUpdateBookingStatus(bookingId: number, nextStatus: string) {
    setErrorMessage("");
    setSuccessMessage("");
    setIsUpdatingBookingId(bookingId);

    const { data, error } = await supabase.rpc("admin_update_booking_status", {
      target_booking_id: bookingId,
      next_status: nextStatus,
    });

    setIsUpdatingBookingId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const updatedBooking = Array.isArray(data) ? data[0] : data;

    if (!updatedBooking) {
      setErrorMessage("The booking was updated, but we could not read the new status back.");
      return;
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId ? (updatedBooking as Booking) : booking,
      ),
    );
    setSuccessMessage(`Booking updated to ${nextStatus}.`);
  }

  async function handleCreateDailyUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!household) {
      setErrorMessage("We could not find this household.");
      return;
    }

    setIsSubmittingUpdate(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const bookingId = Number(formData.get("updateBookingId"));
    const message = String(formData.get("updateMessage") || "").trim();
    const photoEntries = formData.getAll("updatePhotos");
    const files = photoEntries.filter(
      (entry): entry is File => entry instanceof File && entry.size > 0,
    );

    if (!bookingId) {
      setIsSubmittingUpdate(false);
      setErrorMessage("Please choose a booking for this update.");
      return;
    }

    if (!message) {
      setIsSubmittingUpdate(false);
      setErrorMessage("Please write a short update message.");
      return;
    }

    if (files.length === 0) {
      setIsSubmittingUpdate(false);
      setErrorMessage("Please add at least one photo for the daily update.");
      return;
    }

    const selectedBooking = bookings.find((booking) => booking.id === bookingId);

    if (!selectedBooking?.pet_id) {
      setIsSubmittingUpdate(false);
      setErrorMessage("We could not match that booking to a pet record.");
      return;
    }

    const selectedPet = pets.find((pet) => pet.id === selectedBooking.pet_id);

    if (!selectedPet) {
      setIsSubmittingUpdate(false);
        setErrorMessage("We could not match that pet record.");
      return;
    }

    let imageUrls: string[] = [];

    try {
      imageUrls = await uploadDailyUpdatePhotos(files, household.id, selectedPet.name);
    } catch (error) {
      setIsSubmittingUpdate(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to upload the daily update photos.",
      );
      return;
    }

    const { data, error } = await supabase.rpc("admin_create_daily_update", {
      target_household_id: household.id,
      target_booking_id: bookingId,
      update_message: message,
      image_urls: imageUrls,
    });

    setIsSubmittingUpdate(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const createdUpdate = Array.isArray(data) ? data[0] : data;

    if (!createdUpdate) {
      setErrorMessage("The update was created, but we could not read it back.");
      return;
    }

    setDailyUpdates((current) => [createdUpdate as DailyUpdate, ...current]);
    setDailyUpdatePhotos((current) => [
      ...imageUrls.map((imageUrl, index) => ({
        id: Date.now() + index,
        daily_update_id: (createdUpdate as DailyUpdate).id,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      })),
      ...current,
    ]);
    setSuccessMessage("Daily update published successfully.");
    form.reset();
  }

  async function handleUpdateClientProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!household) {
      setErrorMessage("We could not find this household.");
      return;
    }

    setIsSavingHousehold(true);
    const formData = new FormData(event.currentTarget);
    const nextEmail = String(formData.get("contactEmail") || "").trim();
    const nextPhone = String(formData.get("contactPhone") || "").trim();

    const { data, error } = await supabase.rpc("admin_update_household_contact", {
      target_household_id: household.id,
      next_contact_email: nextEmail || null,
      next_contact_phone: nextPhone || null,
    });

    setIsSavingHousehold(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const updatedHousehold = Array.isArray(data) ? data[0] : data;

    if (!updatedHousehold) {
      setErrorMessage("The household saved, but we could not read the updated contact info.");
      return;
    }

    setHousehold((current) =>
      current
        ? {
            ...current,
            contact_email: updatedHousehold.contact_email,
            contact_phone: updatedHousehold.contact_phone,
          }
        : current,
    );
    setSuccessMessage("Client profile updated successfully.");
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

  function startEditingUpdate(updateId: number) {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingUpdateId(updateId);
  }

  function stopEditingUpdate() {
    setEditingUpdateId(null);
  }

  async function handleEditDailyUpdate(
    event: FormEvent<HTMLFormElement>,
    update: DailyUpdate,
  ) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSavingUpdateId(update.id);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextMessage = String(formData.get("editUpdateMessage") || "").trim();
    const photoEntries = formData.getAll("editUpdatePhotos");
    const files = photoEntries.filter(
      (entry): entry is File => entry instanceof File && entry.size > 0,
    );

    if (!nextMessage) {
      setIsSavingUpdateId(null);
      setErrorMessage("Please keep a message on the daily update.");
      return;
    }

    let imageUrls: string[] = [];

    if (files.length > 0) {
      const petLabel = update.pet_name || "pet";

      try {
        imageUrls = await uploadDailyUpdatePhotos(files, update.household_id, petLabel);
      } catch (error) {
        setIsSavingUpdateId(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to upload the new daily update photos.",
        );
        return;
      }
    }

    const { data, error } = await supabase.rpc("admin_edit_daily_update", {
      target_daily_update_id: update.id,
      next_message: nextMessage,
      image_urls: imageUrls,
    });

    setIsSavingUpdateId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const updatedDailyUpdate = Array.isArray(data) ? data[0] : data;

    if (!updatedDailyUpdate) {
      setErrorMessage("The update saved, but we could not read it back.");
      return;
    }

    setDailyUpdates((current) =>
      current.map((item) => (item.id === update.id ? (updatedDailyUpdate as DailyUpdate) : item)),
    );

    if (imageUrls.length > 0) {
      setDailyUpdatePhotos((current) => [
        ...current,
        ...imageUrls.map((imageUrl, index) => ({
          id: Date.now() + index,
          daily_update_id: update.id,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
        })),
      ]);
    }

    setSuccessMessage("Daily update saved successfully.");
    setEditingUpdateId(null);
    form.reset();
  }

  async function handleDeleteDailyUpdatePhoto(photoId: number) {
    setErrorMessage("");
    setSuccessMessage("");
    setIsRemovingUpdatePhotoId(photoId);

    const { error } = await supabase.rpc("admin_delete_daily_update_photo", {
      target_photo_id: photoId,
    });

    setIsRemovingUpdatePhotoId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setDailyUpdatePhotos((current) => current.filter((photo) => photo.id !== photoId));
    setSuccessMessage("Photo removed from the daily update.");
  }

  async function handleLogout() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/portal");
    router.refresh();
  }

  const pendingBookings = bookings.filter((booking) => booking.status === "pending");
  const updateCountByBookingId = dailyUpdates.reduce<Record<number, number>>((counts, update) => {
    counts[update.booking_id] = (counts[update.booking_id] ?? 0) + 1;
    return counts;
  }, {});
  const confirmedBookings = bookings
    .filter((booking) => booking.status === "confirmed")
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const currentBookings = confirmedBookings.slice(0, 3);
  const bookingsNeedingFirstUpdate = confirmedBookings.filter(
    (booking) => !updateCountByBookingId[booking.id],
  );
  const confirmedBookingsWithUpdates = confirmedBookings.filter(
    (booking) => updateCountByBookingId[booking.id] > 0,
  );
  const requestedBookingId = Number(searchParams.get("bookingId") || "");

  useEffect(() => {
    const preferredBookingIds = [
      requestedBookingId,
      ...bookingsNeedingFirstUpdate.map((booking) => booking.id),
      ...confirmedBookingsWithUpdates.map((booking) => booking.id),
      ...bookings.map((booking) => booking.id),
    ].filter((bookingId, index, allIds) => bookingId > 0 && allIds.indexOf(bookingId) === index);

    if (preferredBookingIds.length === 0) {
      setSelectedUpdateBookingId("");
      return;
    }

    setSelectedUpdateBookingId((current) => {
      if (current && bookings.some((booking) => String(booking.id) === current)) {
        return current;
      }

      return String(preferredBookingIds[0]);
    });
  }, [bookings, dailyUpdates, requestedBookingId]);

  return (
    <SiteShell>
      <main className="page-main">
        <div className="content-shell">
          <section className="page-card admin-page">
            <span className="eyebrow">Client Profile</span>
            <h1 className="section-title">{getClientLabel()}</h1>
            <p className="section-copy">
              This household page is where bookings, care updates, and profile editing
              will live next. For now, it gives you one place to review the household
              contact details and current pets.
            </p>

            <div className="portal-admin-cta">
              <Link className="button button-secondary" href="/admin/clients">
                Back to Client List
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
            {isLoading ? <p className="portal-loading-text">Loading client profile...</p> : null}

            <div className="admin-grid">
              <article className="admin-card">
                <span className="portal-kicker">Household ID</span>
                <h3>{household?.id ?? "--"}</h3>
                <p>This is the client record currently open in your admin workspace.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Pets</span>
                <h3>{pets.length}</h3>
                <p>These are the pet profiles already attached to this client household.</p>
              </article>
              <article className="admin-card">
                <span className="portal-kicker">Pending Requests</span>
                <h3>{pendingBookings.length}</h3>
                <p>This is the approval queue that still needs your decision.</p>
              </article>
            </div>

            <div className="admin-workspace">
              <section className="form-card admin-form-card">
                <h2>Edit Client Profile</h2>
                <p className="section-copy">
                  Update the client&apos;s contact email and phone number here so booking
                  communication stays current.
                </p>

                <form onSubmit={handleUpdateClientProfile}>
                  <div className="field-grid admin-field-grid">
                    <div className="field field-full">
                      <label htmlFor="contactEmail">Contact Email</label>
                      <input
                        type="email"
                        id="contactEmail"
                        name="contactEmail"
                        defaultValue={household?.contact_email || ""}
                        placeholder="client@email.com"
                      />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="contactPhone">Contact Phone</label>
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
                    disabled={isSavingHousehold || isLoading || !household}
                  >
                    {isSavingHousehold ? "Saving profile..." : "Save Client Profile"}
                  </button>
                </form>
              </section>

              <section className="form-card admin-form-card">
                <h2>Booking Attention</h2>
                <p className="section-copy">
                  Start here when you open a client. Pending requests and current confirmed stays
                  stay at the top so you can act quickly.
                </p>
                <div className="portal-status-stack">
                  <section className="portal-status-group">
                    <div className="portal-status-heading">
                      <h4>Needs First Update</h4>
                      <span>{bookingsNeedingFirstUpdate.length}</span>
                    </div>
                    {bookingsNeedingFirstUpdate.length === 0 ? (
                      <p className="section-copy">
                        Every confirmed stay for this client already has at least one update.
                      </p>
                    ) : (
                      <div className="admin-list">
                        {bookingsNeedingFirstUpdate.map((booking) => (
                          <article className="admin-list-item admin-priority-item" key={booking.id}>
                            <div className="portal-card-topline">
                              <strong>{booking.pet_name || "Pet Booking"}</strong>
                              <span className="status-pill status-pill-attention">No update yet</span>
                            </div>
                            <p>{booking.service_type}</p>
                            <p>{booking.start_date} to {booking.end_date}</p>
                            <a
                              className="button button-secondary"
                              href="#publish-daily-update"
                              onClick={() => setSelectedUpdateBookingId(String(booking.id))}
                            >
                              Jump to Publish Form
                            </a>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="portal-status-group">
                    <div className="portal-status-heading">
                      <h4>Needs Confirmation</h4>
                      <span>{pendingBookings.length}</span>
                    </div>
                    {pendingBookings.length === 0 ? (
                      <p className="section-copy">No pending booking requests right now.</p>
                    ) : (
                      <div className="admin-list">
                        {pendingBookings.map((booking) => (
                          <article className="admin-list-item" key={booking.id}>
                            <div className="portal-card-topline">
                              <strong>{booking.pet_name || "Pet Booking"}</strong>
                              <span className="status-pill status-pill-pending">pending</span>
                            </div>
                            <p>{booking.service_type}</p>
                            <p>{booking.start_date} to {booking.end_date}</p>
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                                marginTop: "14px",
                              }}
                            >
                              <button
                                className="button button-secondary"
                                type="button"
                                onClick={() =>
                                  void handleUpdateBookingStatus(booking.id, "confirmed")
                                }
                                disabled={isUpdatingBookingId === booking.id}
                              >
                                {isUpdatingBookingId === booking.id ? "Saving..." : "Confirm"}
                              </button>
                              <button
                                className="button button-secondary"
                                type="button"
                                onClick={() =>
                                  void handleUpdateBookingStatus(booking.id, "cancelled")
                                }
                                disabled={isUpdatingBookingId === booking.id}
                              >
                                {isUpdatingBookingId === booking.id ? "Saving..." : "Cancel"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="portal-status-group">
                    <div className="portal-status-heading">
                      <h4>Current Confirmed Bookings</h4>
                      <span>{currentBookings.length}</span>
                    </div>
                    {currentBookings.length === 0 ? (
                      <p className="section-copy">No confirmed stays are active for this client right now.</p>
                    ) : (
                      <div className="admin-list">
                        {currentBookings.map((booking) => (
                          <article className="admin-list-item" key={booking.id}>
                            <div className="portal-card-topline">
                              <strong>{booking.pet_name || "Pet Booking"}</strong>
                              <span className="status-pill status-pill-confirmed">confirmed</span>
                            </div>
                            <p>{booking.service_type}</p>
                            <p>{booking.start_date} to {booking.end_date}</p>
                            <p>
                              Published updates: <strong>{updateCountByBookingId[booking.id] ?? 0}</strong>
                            </p>
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => void handleUpdateBookingStatus(booking.id, "completed")}
                              disabled={isUpdatingBookingId === booking.id}
                            >
                              {isUpdatingBookingId === booking.id ? "Saving..." : "Mark Completed"}
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </section>

              <section className="form-card admin-form-card" id="publish-daily-update">
                <h2>Publish Daily Update</h2>
                <p className="section-copy">
                  Keep this simple and client-friendly: upload a few photos and leave a
                  short message for the pet parent to read in their portal.
                </p>
                <p className="section-copy">
                  You can select multiple photos for one update. They will be shown together
                  inside the same booking update card in the pet parent portal.
                </p>
                <p className="section-copy">
                  Photos are automatically resized and compressed before upload to keep daily
                  updates faster to open.
                </p>
                {selectedUpdateBookingId ? (
                  <p className="admin-priority-note">
                    {(() => {
                      const selectedBooking = bookings.find(
                        (booking) => String(booking.id) === selectedUpdateBookingId,
                      );

                      if (!selectedBooking) {
                        return "Choose the booking that should receive this update.";
                      }

                      return updateCountByBookingId[selectedBooking.id]
                        ? `Selected booking already has ${updateCountByBookingId[selectedBooking.id]} published update${updateCountByBookingId[selectedBooking.id] === 1 ? "" : "s"}.`
                        : "Selected booking has no published updates yet.";
                    })()}
                  </p>
                ) : null}

                <form onSubmit={handleCreateDailyUpdate}>
                  <div className="field-grid admin-field-grid">
                    <div className="field field-full">
                      <label htmlFor="updateBookingId">Booking</label>
                      <select
                        id="updateBookingId"
                        name="updateBookingId"
                        className="admin-select"
                        required
                        value={selectedUpdateBookingId}
                        onChange={(event) => setSelectedUpdateBookingId(event.target.value)}
                      >
                        <option value="" disabled>
                          Select a booking
                        </option>
                        {bookingsNeedingFirstUpdate.length > 0 ? (
                          <optgroup label="Needs First Update">
                            {bookingsNeedingFirstUpdate.map((booking) => (
                              <option key={booking.id} value={booking.id}>
                                {booking.pet_name || "Pet"} | {booking.service_type} | {booking.start_date}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        {confirmedBookingsWithUpdates.length > 0 ? (
                          <optgroup label="Confirmed Stays">
                            {confirmedBookingsWithUpdates.map((booking) => (
                              <option key={booking.id} value={booking.id}>
                                {booking.pet_name || "Pet"} | {booking.service_type} | {booking.start_date}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        {bookings.filter((booking) => booking.status !== "confirmed").length > 0 ? (
                          <optgroup label="Other Bookings">
                            {bookings
                              .filter((booking) => booking.status !== "confirmed")
                              .map((booking) => (
                                <option key={booking.id} value={booking.id}>
                                  {booking.pet_name || "Pet"} | {booking.service_type} | {booking.start_date} | {booking.status}
                                </option>
                              ))}
                          </optgroup>
                        ) : null}
                      </select>
                    </div>
                    <div className="field field-full">
                      <label htmlFor="updateMessage">Message</label>
                      <textarea id="updateMessage" name="updateMessage" rows={5} />
                    </div>
                    <div className="field field-full">
                      <label htmlFor="updatePhotos">Photos</label>
                      <input
                        type="file"
                        id="updatePhotos"
                        name="updatePhotos"
                        accept="image/*"
                        multiple
                        required
                      />
                    </div>
                  </div>

                  <button
                    className="submit-button"
                    type="submit"
                    disabled={isSubmittingUpdate || isLoading || bookings.length === 0}
                  >
                    {isSubmittingUpdate ? "Uploading photos and publishing..." : "Publish Daily Update"}
                  </button>
                </form>
              </section>
            </div>

            <div className="admin-workspace admin-lists-grid">
              <section className="admin-list-card">
                <h2>Pet Profiles</h2>
                {pets.length === 0 ? (
                  <p className="section-copy">
                    No pets have been created for this household yet. The next step is
                    adding pet profiles here or from the parent portal.
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
                        ) : null}
                        <strong>{pet.name}</strong>
                        <p>Breed: {pet.breed || "Not added yet"}</p>
                        <p>Age: {pet.age || "Not added yet"}</p>
                        <p>Vaccination: {pet.vaccination_status || "Not added yet"}</p>
                        <p>Notes: {pet.notes || "No notes yet"}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="admin-list-card">
                <h2>Bookings</h2>
                {bookings.length === 0 ? (
                  <p className="section-copy">
                    No bookings yet. Once the client submits a request, it will show up here.
                  </p>
                ) : (
                  <div className="portal-status-stack">
                    {getBookingGroups().map((group) => (
                      <section key={group.status} className="portal-status-group">
                        <div className="portal-status-heading">
                          <h4>{group.label}</h4>
                          <span>{group.items.length}</span>
                        </div>
                        <div className="admin-list">
                          {group.items.map((booking) => (
                            <article className="admin-list-item" key={booking.id}>
                              <div className="portal-card-topline">
                                <strong>{booking.service_type}</strong>
                                <span className={`status-pill status-pill-${booking.status}`}>
                                  {booking.status}
                                </span>
                              </div>
                              <p>Pet: {booking.pet_name || "Not linked yet"}</p>
                              <p>Start: {booking.start_date}</p>
                              <p>End: {booking.end_date}</p>
                              <p>Notes: {booking.notes || "No notes yet"}</p>
                              <p>Drop-off: {booking.drop_off_note || "No drop-off note yet"}</p>
                              <p>Pick-up: {booking.pick_up_note || "No pick-up note yet"}</p>
                              <p>
                                Special instructions:{" "}
                                {booking.special_instructions || "No special instructions yet"}
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  flexWrap: "wrap",
                                  marginTop: "14px",
                                }}
                              >
                                {booking.status === "confirmed" ? (
                                  <button
                                    className="button button-secondary"
                                    type="button"
                                    onClick={() =>
                                      void handleUpdateBookingStatus(booking.id, "completed")
                                    }
                                    disabled={isUpdatingBookingId === booking.id}
                                  >
                                    {isUpdatingBookingId === booking.id ? "Saving..." : "Mark Completed"}
                                  </button>
                                ) : null}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="admin-list-card">
              <h2>Daily Updates</h2>
              {dailyUpdates.length === 0 ? (
                <p className="section-copy">
                  No daily updates yet. Publish the first photo update from the form above.
                </p>
              ) : (
                <div className="admin-list">
                  {dailyUpdates.map((update) => (
                    <article
                      className="admin-list-item"
                      key={update.id}
                      style={{
                        border: "1px solid #eedcca",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,243,235,0.98) 100%)",
                      }}
                      >
                        <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "flex-start",
                          marginBottom: "12px",
                        }}
                      >
                        <div>
                          <strong style={{ display: "block", marginBottom: "6px" }}>
                            {update.pet_name || "Pet Update"}
                          </strong>
                          <p style={{ margin: 0 }}>{update.booking_label || "Booking update"}</p>
                        </div>
                        <span
                          style={{
                            fontSize: "0.9rem",
                            color: "#7b6b5f",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatUpdateDate(update.created_at)}
                        </span>
                        </div>
                        {editingUpdateId === update.id ? (
                          <form onSubmit={(event) => void handleEditDailyUpdate(event, update)}>
                            <div className="field field-full" style={{ marginBottom: "14px" }}>
                              <label htmlFor={`editUpdateMessage-${update.id}`}>Message</label>
                              <textarea
                                id={`editUpdateMessage-${update.id}`}
                                name="editUpdateMessage"
                                rows={5}
                                defaultValue={update.message}
                              />
                            </div>
                            <div className="field field-full">
                              <label htmlFor={`editUpdatePhotos-${update.id}`}>
                                Add More Photos
                              </label>
                              <input
                                type="file"
                                id={`editUpdatePhotos-${update.id}`}
                                name="editUpdatePhotos"
                                accept="image/*"
                                multiple
                              />
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "12px",
                                flexWrap: "wrap",
                                marginTop: "16px",
                              }}
                            >
                              <button
                                className="submit-button"
                                type="submit"
                                disabled={isSavingUpdateId === update.id}
                              >
                                {isSavingUpdateId === update.id ? "Saving..." : "Save Update"}
                              </button>
                              <button
                                className="button button-secondary"
                                type="button"
                                onClick={stopEditingUpdate}
                                disabled={isSavingUpdateId === update.id}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <p style={{ margin: "0 0 14px", lineHeight: 1.75 }}>{update.message}</p>
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
                                    <div
                                      key={photo.id}
                                      style={{
                                        position: "relative",
                                      }}
                                    >
                                      <img
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
                                      <button
                                        className="button button-secondary"
                                        type="button"
                                        onClick={() => void handleDeleteDailyUpdatePhoto(photo.id)}
                                        disabled={isRemovingUpdatePhotoId === photo.id}
                                        style={{
                                          position: "absolute",
                                          top: "10px",
                                          right: "10px",
                                          padding: "8px 12px",
                                          backgroundColor: "rgba(255, 250, 245, 0.92)",
                                        }}
                                      >
                                        {isRemovingUpdatePhotoId === photo.id ? "Removing..." : "Remove"}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : null;
                            })()}
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
                                onClick={() => startEditingUpdate(update.id)}
                              >
                                Edit Update
                              </button>
                            </div>
                          </>
                        )}
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
