"use server";

import { z } from "zod";

import { db } from "@/db";
import {
  createProduct,
  productCreateSchema,
  productInputSchema,
  setProductArchived,
  updateProduct,
} from "@/lib/admin/catalogue";
import { fieldErrorsOf } from "@/lib/admin/errors";
import { invalidateCatalog } from "@/lib/cache";
import { getAdminUser } from "@/lib/session";

export type ProductActionResult =
  | { ok: true; slug?: string; id?: number }
  | { ok: false; reason: "forbidden" | "not_found" | "slug_taken" | "category_not_found" | "failed" }
  | { ok: false; reason: "validation"; fieldErrors: Record<string, string> };

const idSchema = z.coerce.number().int().positive();

/** Create (no id) or update (id). Slug can only be set on create. */
export async function saveProductAction(raw: unknown): Promise<ProductActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, reason: "forbidden" };

  const rawId = (raw as { id?: unknown } | null)?.id;
  try {
    if (rawId === undefined || rawId === null || rawId === "") {
      const input = productCreateSchema.safeParse(raw);
      if (!input.success) return { ok: false, reason: "validation", fieldErrors: fieldErrorsOf(input.error) };
      const r = await createProduct(db, admin, input.data);
      if (!r.ok) {
        return r.reason === "slug_taken" || r.reason === "category_not_found"
          ? { ok: false, reason: r.reason }
          : { ok: false, reason: "failed" };
      }
      invalidateCatalog();
      return { ok: true, slug: r.slug };
    }

    const id = idSchema.safeParse(rawId);
    const input = productInputSchema.safeParse(raw);
    if (!id.success) return { ok: false, reason: "not_found" };
    if (!input.success) return { ok: false, reason: "validation", fieldErrors: fieldErrorsOf(input.error) };
    const r = await updateProduct(db, admin, id.data, input.data);
    if (!r.ok) {
      return r.reason === "not_found" || r.reason === "category_not_found"
        ? { ok: false, reason: r.reason }
        : { ok: false, reason: "failed" };
    }
    invalidateCatalog();
    return { ok: true, id: id.data };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function archiveProductAction(raw: unknown): Promise<ProductActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, reason: "forbidden" };
  const parsed = z.object({ id: idSchema, archived: z.boolean() }).safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "not_found" };
  try {
    const r = await setProductArchived(db, admin, parsed.data.id, parsed.data.archived);
    if (!r.ok) return { ok: false, reason: "not_found" };
    invalidateCatalog();
    return { ok: true, id: parsed.data.id };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
