const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_TARGET_BYTES = 900_000;
const DEFAULT_INITIAL_QUALITY = 0.82;
const DEFAULT_MIN_QUALITY = 0.58;

type CompressionOptions = {
  maxDimension?: number;
  targetBytes?: number;
  initialQuality?: number;
  minQuality?: number;
};

function shouldSkipCompression(file: File) {
  if (!file.type.startsWith("image/")) {
    return true;
  }

  return file.type === "image/gif" || file.type === "image/svg+xml";
}

function getScaledDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const scale = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read the image before upload."));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to prepare the image for upload."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function getCompressedFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName || "upload"}.jpg`;
}

export async function compressImageFile(file: File, options: CompressionOptions = {}) {
  if (typeof window === "undefined" || shouldSkipCompression(file)) {
    return file;
  }

  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const targetBytes = options.targetBytes ?? DEFAULT_TARGET_BYTES;
  const initialQuality = options.initialQuality ?? DEFAULT_INITIAL_QUALITY;
  const minQuality = options.minQuality ?? DEFAULT_MIN_QUALITY;
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromUrl(objectUrl);
    const dimensions = getScaledDimensions(image.naturalWidth, image.naturalHeight, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

    let quality = initialQuality;
    let blob = await canvasToBlob(canvas, quality);

    while (blob.size > targetBytes && quality > minQuality) {
      quality = Math.max(minQuality, quality - 0.08);
      blob = await canvasToBlob(canvas, quality);
    }

    if (
      blob.size >= file.size &&
      dimensions.width === image.naturalWidth &&
      dimensions.height === image.naturalHeight &&
      file.type === "image/jpeg"
    ) {
      return file;
    }

    return new File([blob], getCompressedFileName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
