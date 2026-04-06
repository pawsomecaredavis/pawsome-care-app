import { compressImageFile } from "./image-upload";
import { supabase } from "./supabase";

export const DAILY_UPDATE_BUCKET = "daily-updates";

function sanitizeName(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "update";
}

export async function uploadDailyUpdatePhotos(
  files: File[],
  householdId: number,
  petName: string,
) {
  const uploadedUrls: string[] = [];
  const safePetName = sanitizeName(petName);

  for (const file of files) {
    const preparedFile = await compressImageFile(file, {
      maxDimension: 1600,
      targetBytes: 850_000,
      initialQuality: 0.8,
      minQuality: 0.56,
    });
    const extension = preparedFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${householdId}/${Date.now()}-${safePetName}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(DAILY_UPDATE_BUCKET)
      .upload(filePath, preparedFile, {
        contentType: preparedFile.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(DAILY_UPDATE_BUCKET).getPublicUrl(filePath);
    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}
