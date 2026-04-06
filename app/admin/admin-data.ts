import { supabase } from "../../lib/supabase";
import { getCurrentProfile, type Profile } from "../../lib/profile";

export type { Profile } from "../../lib/profile";

export type Household = {
  id: number;
  owner_user_id: string;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  client_name?: string | null;
};

export type Pet = {
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

export type Booking = {
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

export type DailyUpdate = {
  id: number;
  household_id: number;
  booking_id: number;
  pet_id: number;
  pet_name: string | null;
  booking_label: string | null;
  message: string;
  created_at: string;
};

export async function getAuthenticatedAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(userError?.message || "You need to log in first.");
  }

  const profile = await getCurrentProfile(user.id);

  if (profile.role !== "admin") {
    throw new Error("This page is only for admin accounts.");
  }

  return { user, profile };
}

export function getHouseholdLabel(household: Household) {
  if (household.client_name?.trim()) {
    return household.client_name;
  }

  if (household.contact_email?.trim()) {
    return household.contact_email;
  }

  return `Household #${household.id}`;
}

export async function getClientHouseholds(adminUserId: string) {
  const householdResult = await supabase.rpc("get_admin_households");

  if (householdResult.error) {
    throw new Error(householdResult.error.message);
  }

  const allHouseholds = (householdResult.data as Household[]) ?? [];
  return allHouseholds.filter((household) => household.owner_user_id !== adminUserId);
}

export async function getAdminPets() {
  const petResult = await supabase.rpc("get_admin_pets");

  if (petResult.error) {
    throw new Error(petResult.error.message);
  }

  return (petResult.data as Pet[]) ?? [];
}

export async function getAdminBookingsForHouseholds(households: Household[]) {
  const bookingResults = await Promise.all(
    households.map(async (household) => {
      const bookingResult = await supabase.rpc("get_admin_bookings_for_household", {
        target_household_id: household.id,
      });

      if (bookingResult.error) {
        throw new Error(bookingResult.error.message);
      }

      return (bookingResult.data as Booking[]) ?? [];
    }),
  );

  return bookingResults.flat();
}

export async function getAdminDailyUpdatesForHouseholds(households: Household[]) {
  const updateResults = await Promise.all(
    households.map(async (household) => {
      const updateResult = await supabase.rpc("get_admin_daily_updates_for_household", {
        target_household_id: household.id,
      });

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }

      return (updateResult.data as DailyUpdate[]) ?? [];
    }),
  );

  return updateResults.flat();
}
