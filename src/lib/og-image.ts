import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import sharp from "sharp";

/**
 * Link-preview images (WhatsApp, iMessage, X, Facebook). The homepage card is
 * the static `app/opengraph-image.jpg`; product cards are rendered on request
 * from the product photo by `app/products/[slug]/opengraph-image.ts`.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/jpeg";
// --color-surface-dark (#0b0b0b), the page ground behind the black product photography.
const BACKGROUND = { r: 11, g: 11, b: 11, alpha: 1 };
const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Public origin for metadata URLs (og:image must be absolute). Unset falls back to Next's default. */
export function siteUrl(): URL | undefined {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const raw = process.env.APP_URL || process.env.BETTER_AUTH_URL || (vercel ? `https://${vercel}` : undefined);
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

async function requestOrigin(): Promise<string | undefined> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteUrl()?.origin;
  return `${h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http")}://${host}`;
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Photo bytes for a `/file` in public/ or an https URL (Vercel Blob, Unsplash). */
async function loadPhoto(src: string, origin: string | undefined): Promise<Buffer | null> {
  if (src.startsWith("/") && !src.startsWith("//")) {
    const file = path.join(PUBLIC_DIR, decodeURIComponent(src.split("?")[0]));
    if (file.startsWith(PUBLIC_DIR + path.sep)) {
      try {
        return await readFile(file);
      } catch {
        // public/ is not always bundled with the server function; fetch it from the site instead.
      }
    }
    return origin ? fetchImage(new URL(src, origin).toString()) : null;
  }
  return src.startsWith("https://") ? fetchImage(src) : null;
}

/**
 * 1200x630 JPEG with the whole product photo centred on the brand black.
 * Without a usable photo it redirects to the homepage card.
 */
export async function productOgImage(src: string | undefined): Promise<Response> {
  const origin = await requestOrigin();
  const photo = src ? await loadPhoto(src, origin) : null;
  if (photo) {
    try {
      const jpeg = await sharp(photo)
        .rotate()
        .resize(OG_SIZE.width, OG_SIZE.height, { fit: "contain", background: BACKGROUND })
        .flatten({ background: BACKGROUND })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
      return new Response(new Uint8Array(jpeg), {
        headers: {
          "Content-Type": OG_CONTENT_TYPE,
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      // unreadable image: fall through to the homepage card
    }
  }
  return Response.redirect(new URL("/opengraph-image.jpg", origin ?? "http://localhost:3000"), 307);
}
