import { compressImageFile } from "./image-upload";
import { supabase } from "./supabase";

export const PET_PHOTO_BUCKET = "pet-photos";

function sanitizeName(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "pet";
}

export async function uploadPetPhoto(file: File, householdId: number, petName: string) {
  const preparedFile = await compressImageFile(file, {
    maxDimension: 1400,
    targetBytes: 700_000,
    initialQuality: 0.8,
    minQuality: 0.56,
  });
  const extension = preparedFile.name.split(".").pop()?.toLowerCase() || "jpg";
  const safePetName = sanitizeName(petName);
  const filePath = `${householdId}/${Date.now()}-${safePetName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PET_PHOTO_BUCKET)
    .upload(filePath, preparedFile, {
      contentType: preparedFile.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(PET_PHOTO_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
