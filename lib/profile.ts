import { supabase } from "./supabase";

export type Profile = {
  full_name: string | null;
  role: "admin" | "parent";
};

export async function getCurrentProfile(userId: string) {
  const profileResult = await supabase.rpc("get_my_profile");
  const profileRow = Array.isArray(profileResult.data)
    ? profileResult.data[0]
    : profileResult.data;

  if (profileRow) {
    return profileRow as Profile;
  }

  if (profileResult.error) {
    const fallbackResult = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message);
    }

    if (fallbackResult.data) {
      return fallbackResult.data as Profile;
    }

    throw new Error(profileResult.error.message);
  }

  const fallbackResult = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (fallbackResult.error) {
    throw new Error(fallbackResult.error.message);
  }

  if (!fallbackResult.data) {
    throw new Error("Unable to load your profile.");
  }

  return fallbackResult.data as Profile;
}
