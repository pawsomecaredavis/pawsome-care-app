import { compressImageFile } from "./image-upload";
import { supabase } from "./supabase";

export const GALLERY_BUCKET = "gallery-images";

export type GalleryImage = {
  id: number | string;
  image_url: string;
  alt_text: string;
  storage_path?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

export const fallbackGalleryImages: GalleryImage[] = [
  { id: "/images/gallery/IMG_0053.JPG", image_url: "/images/gallery/IMG_0053.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_0256.JPG", image_url: "/images/gallery/IMG_0256.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_0301.JPG", image_url: "/images/gallery/IMG_0301.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_1165.JPG", image_url: "/images/gallery/IMG_1165.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_1167.JPG", image_url: "/images/gallery/IMG_1167.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_1171.JPG", image_url: "/images/gallery/IMG_1171.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_1959.JPG", image_url: "/images/gallery/IMG_1959.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_2430.JPG", image_url: "/images/gallery/IMG_2430.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_3518.JPG", image_url: "/images/gallery/IMG_3518.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_3733.JPG", image_url: "/images/gallery/IMG_3733.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_3973.JPG", image_url: "/images/gallery/IMG_3973.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_4097.JPG", image_url: "/images/gallery/IMG_4097.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_4142.JPG", image_url: "/images/gallery/IMG_4142.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_4914.JPG", image_url: "/images/gallery/IMG_4914.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_5442.JPG", image_url: "/images/gallery/IMG_5442.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_6145.JPG", image_url: "/images/gallery/IMG_6145.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_6557.JPG", image_url: "/images/gallery/IMG_6557.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_7861.JPG", image_url: "/images/gallery/IMG_7861.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_7862.JPG", image_url: "/images/gallery/IMG_7862.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_7939.JPG", image_url: "/images/gallery/IMG_7939.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_8164.JPG", image_url: "/images/gallery/IMG_8164.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_8223.JPG", image_url: "/images/gallery/IMG_8223.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_8602.JPG", image_url: "/images/gallery/IMG_8602.JPG", alt_text: "A dog relaxing in Jennifer's arms" },
  { id: "/images/gallery/IMG_8630.JPG", image_url: "/images/gallery/IMG_8630.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/IMG_8876.JPG", image_url: "/images/gallery/IMG_8876.JPG", alt_text: "Jennifer outdoors with two dogs" },
  { id: "/images/gallery/IMG_9363.JPG", image_url: "/images/gallery/IMG_9363.JPG", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/07c90a44deede7f9970d9b9504bdc4f3.jpeg", image_url: "/images/gallery/07c90a44deede7f9970d9b9504bdc4f3.jpeg", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/741018f462f175a4e9a502ee96f28ca0.jpg", image_url: "/images/gallery/741018f462f175a4e9a502ee96f28ca0.jpg", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/88b6218dd1bd52a65176dcaef2bb8e58.jpeg", image_url: "/images/gallery/88b6218dd1bd52a65176dcaef2bb8e58.jpeg", alt_text: "Dog photo from Pawsome Care" },
  { id: "/images/gallery/cf959a15375feeaecaa0d39d15789350.jpeg", image_url: "/images/gallery/cf959a15375feeaecaa0d39d15789350.jpeg", alt_text: "Dog photo from Pawsome Care" },
];

function sanitizeName(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "") || "gallery-photo";
}

export async function uploadGalleryImage(file: File) {
  const preparedFile = await compressImageFile(file, {
    maxDimension: 1800,
    targetBytes: 900_000,
    initialQuality: 0.82,
    minQuality: 0.58,
  });
  const extension = preparedFile.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = sanitizeName(preparedFile.name.replace(/\.[^.]+$/, ""));
  const filePath = `${Date.now()}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(filePath, preparedFile, {
      contentType: preparedFile.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(filePath);
  return {
    filePath,
    publicUrl: data.publicUrl,
  };
}
