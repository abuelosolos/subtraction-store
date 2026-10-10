"use server";

import { z } from "zod";

import { db } from "@/db";
import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from "@/lib/addresses";
import { deliverySchema } from "@/lib/customer";
import { getSessionUser } from "@/lib/session";

export type AddressActionResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "not_found" | "limit_reached" }
  | { ok: false; reason: "validation"; fieldErrors: Record<string, string> };

const label = z
  .string()
  .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, "").trim())
  .pipe(z.string().max(50))
  .optional()
  .transform((s) => (s ? s : undefined));

const optionsSchema = z.object({
  id: z.uuid().optional(),
  label,
  makeDefault: z.boolean().optional(),
});

/** Create (no id) or update (id) one of the signed-in user's addresses. */
export async function saveAddressAction(raw: unknown): Promise<AddressActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const fieldErrors: Record<string, string> = {};
  const details = deliverySchema.safeParse(raw);
  const options = optionsSchema.safeParse(raw);
  for (const parsed of [details, options]) {
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join(".") || "form"] ??= issue.message;
      }
    }
  }
  if (!details.success || !options.success) {
    return { ok: false, reason: "validation", fieldErrors };
  }

  const input = { ...details.data, label: options.data.label };
  const result = options.data.id
    ? await updateAddress(db, user.id, options.data.id, input)
    : await createAddress(db, user.id, input, { makeDefault: options.data.makeDefault });

  if (!result.ok) return result;
  if (options.data.id && options.data.makeDefault && !result.address.isDefault) {
    const switched = await setDefaultAddress(db, user.id, options.data.id);
    if (!switched.ok) return switched;
  }
  return { ok: true };
}

export async function deleteAddressAction(id: unknown): Promise<AddressActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, reason: "not_found" };
  return deleteAddress(db, user.id, parsed.data);
}

export async function setDefaultAddressAction(id: unknown): Promise<AddressActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, reason: "not_found" };
  const result = await setDefaultAddress(db, user.id, parsed.data);
  return result.ok ? { ok: true } : result;
}
