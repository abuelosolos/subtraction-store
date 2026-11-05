import { upload } from "@vercel/blob/client";

/** Browser-side image upload to Vercel Blob, shared by ImageField and GalleryField. */

export const MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function measureUrl(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("unreadable"));
    img.src = url;
  });
}

async function measureFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    return await measureUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Why an upload failed, in words: asks the server whether Blob storage is configured. */
async function explainUploadFailure(): Promise<string> {
  try {
    const res = await fetch("/api/admin/upload", { method: "GET", cache: "no-store" });
    if (res.status === 403) return "Your session can't upload. Sign in again as an admin.";
    const body = (await res.json()) as { configured?: boolean };
    if (body.configured === false) {
      return "Blob storage isn't configured: BLOB_READ_WRITE_TOKEN is missing in this environment.";
    }
  } catch {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return "The upload was rejected. Check the file type and size (JPEG, PNG, WebP or AVIF, up to 5 MB).";
}

/** Error whose message is safe to show to the admin. */
export class UploadError extends Error {}

/**
 * Validates, measures and uploads one image. Resolves with its public URL and
 * real pixel size; rejects with an UploadError carrying a readable message.
 */
export async function uploadImage(
  folder: "products" | "categories",
  file: File,
): Promise<{ src: string; width: number; height: number }> {
  if (!IMAGE_TYPES.includes(file.type)) throw new UploadError("Use a JPEG, PNG, WebP or AVIF image.");
  if (file.size > MAX_BYTES) throw new UploadError("Images can be at most 5 MB.");
  try {
    const { width, height } = await measureFile(file);
    const safeName = file.name.replace(/[^\w.\- ]/g, "_").slice(-80);
    const blob = await upload(`${folder}/${safeName}`, file, {
      access: "public",
      handleUploadUrl: "/api/admin/upload",
      contentType: file.type,
    });
    return { src: blob.url, width, height };
  } catch {
    throw new UploadError(await explainUploadFailure());
  }
}
