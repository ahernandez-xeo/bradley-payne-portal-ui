/** Max upload size for portal images (logos and location narratives). */
export const MAX_IMAGE_BYTES = 200 * 1024;

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode image"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });

let webpSupported;

const supportsWebp = async () => {
  if (webpSupported !== undefined) {
    return webpSupported;
  }
  if (typeof document === "undefined") {
    webpSupported = false;
    return false;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupported;
};

/**
 * Return the file unchanged when already under the limit; otherwise shrink /
 * re-encode via canvas. SVG over the limit is rejected (cannot compress safely).
 */
export async function prepareImageForUpload(
  file,
  { maxBytes = MAX_IMAGE_BYTES } = {}
) {
  if (!file) {
    throw new Error("A file is required");
  }
  if (file.size <= maxBytes) {
    return { file, compressed: false };
  }

  const lowerName = (file.name || "image").toLowerCase();
  const isSvg =
    file.type === "image/svg+xml" || lowerName.endsWith(".svg");
  if (isSvg) {
    throw new Error(
      `Image is ${Math.round(file.size / 1024)} KB. SVG files must be ${
        maxBytes / 1024
      } KB or smaller.`
    );
  }

  const bitmap = await createImageBitmap(file);
  try {
    let width = bitmap.width;
    let height = bitmap.height;
    const maxDim = 1600;
    if (Math.max(width, height) > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const useWebp = await supportsWebp();
    const mimeType = useWebp ? "image/webp" : "image/jpeg";
    const ext = useWebp ? ".webp" : ".jpg";
    const canvas = document.createElement("canvas");
    let quality = 0.85;
    let blob = null;

    for (let attempt = 0; attempt < 14; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!useWebp) {
        // JPEG has no alpha — fill white so transparent logos stay readable.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(bitmap, 0, 0, width, height);
      blob = await canvasToBlob(canvas, mimeType, quality);

      if (blob.size <= maxBytes) {
        break;
      }
      if (quality > 0.5) {
        quality = Math.max(0.45, quality - 0.1);
      } else {
        width = Math.max(1, Math.round(width * 0.8));
        height = Math.max(1, Math.round(height * 0.8));
        quality = 0.75;
        if (width < 180 && height < 180) {
          break;
        }
      }
    }

    if (!blob || blob.size > maxBytes) {
      throw new Error(
        `Could not compress image under ${maxBytes / 1024} KB. Please choose a smaller file.`
      );
    }

    const baseName = (file.name || "image").replace(/\.[^.]+$/, "");
    const compressedFile = new File([blob], `${baseName}${ext}`, {
      type: mimeType,
      lastModified: Date.now(),
    });
    return { file: compressedFile, compressed: true };
  } finally {
    if (typeof bitmap.close === "function") {
      bitmap.close();
    }
  }
}
