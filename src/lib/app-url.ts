import { headers } from "next/headers";

/**
 * Public base URL used for the Paystack callback. Production must set APP_URL;
 * in development we fall back to the request host so `next dev` works.
 */
export async function appUrl(): Promise<string> {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL is not set");
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) throw new Error("Cannot determine app URL; set APP_URL");
  return `${proto}://${host}`;
}
