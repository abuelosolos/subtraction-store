import { headers } from "next/headers";

/**
 * Public base URL used for the Paystack callback. APP_URL wins when set
 * (production); otherwise the request host is used so `next dev` and Vercel
 * preview deployments send customers back to the deployment they paid on.
 */
export async function appUrl(): Promise<string> {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "production" ? "https" : "http");
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  throw new Error("Cannot determine app URL; set APP_URL");
}
