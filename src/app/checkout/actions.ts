"use server";

import { db } from "@/db";
import { appUrl } from "@/lib/app-url";
import { invalidateCatalog } from "@/lib/cache";
import { previewCart, startCheckout } from "@/lib/checkout";
import {
  cartLineSchema,
  checkoutInputSchema,
  isCountryCode,
} from "@/lib/customer";
import type { CartError, PricedCart } from "@/lib/pricing";
import { getSessionUser } from "@/lib/session";
import { z } from "zod";

/** Advisory totals for the summary. Authoritative pricing happens again on submit. */
export async function previewCheckoutAction(
  lines: unknown,
  country: unknown,
): Promise<PricedCart | { ok: false; errors: [{ code: "unauthenticated" }] }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, errors: [{ code: "unauthenticated" }] };

  const parsed = z.array(cartLineSchema).max(50).safeParse(lines);
  const code = typeof country === "string" ? country.trim().toUpperCase() : "";
  if (!parsed.success) return { ok: false, errors: [{ code: "empty_cart" }] };
  return previewCart(db, parsed.data, isCountryCode(code) ? code : "NG");
}

export type StartCheckoutActionResult =
  | { ok: true; authorizationUrl: string }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "validation"; fieldErrors: Record<string, string> }
  | { ok: false; reason: "invalid_cart"; errors: CartError[] }
  | { ok: false; reason: "sold_out" }
  | { ok: false; reason: "address_not_found" }
  | { ok: false; reason: "payment_unavailable" };

export async function startCheckoutAction(raw: unknown): Promise<StartCheckoutActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // Anything the client adds beyond lines + delivery fields is dropped by the schema.
  const parsed = checkoutInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, reason: "validation", fieldErrors };
  }

  const result = await startCheckout(
    db,
    {
      user: { id: user.id, email: user.email },
      lines: parsed.data.lines.map((l) => ({
        slug: l.slug,
        size: l.size ?? null,
        quantity: l.quantity,
      })),
      delivery: parsed.data.details,
      savedAddressId: parsed.data.savedAddressId,
      saveAddress: parsed.data.saveAddress,
      callbackUrl: `${await appUrl()}/checkout/callback`,
    },
    { onStockChanged: invalidateCatalog },
  );

  if (result.ok) return { ok: true, authorizationUrl: result.authorizationUrl };
  if (result.reason === "payment_unavailable") return { ok: false, reason: "payment_unavailable" };
  return result;
}
