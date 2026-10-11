"use server";

import { del } from "@vercel/blob";
import { z } from "zod";

import { db } from "@/db";
import {
  createProduct,
  productCreateSchema,
  productNameSchema,
  productUpdateSchema,
  renameProduct,
  setProductArchived,
  updateProduct,
} from "@/lib/admin/catalogue";
import { fieldErrorsOf } from "@/lib/admin/errors";
import { invalidateCatalog } from "@/lib/cache";
import { getAdminUser } from "@/lib/session";

export type ProductActionResult =
  | { ok: true; slug?: string; id?: number }
  | {
      ok: false;
      reason: "forbidden" | "not_found" | "slug_taken" | "category_not_found" | "db_error" | "failed";
    }
  | { ok: false; reason: "validation"; fieldErrors: Record<string, string> };

const idSchema = z.coerce.number().int().positive();

const isBlobUrl = (src: string) => {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
};

/** Best effort: a replaced upload should not linger in storage. Never fails the save. */
async function deleteReplacedImage(previous: string | undefined, next: string) {
  if (!previous || previous === next || !isBlobUrl(previous) || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(previous);
  } catch (err) {
    console.error("[admin] could not delete replaced image", previous, err);
  }
}

/** Create (no id) or update (id). On update a changed slug keeps the old address as a redirect. */
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
    const input = productUpdateSchema.safeParse(raw);
    if (!id.success) return { ok: false, reason: "not_found" };
    if (!input.success) return { ok: false, reason: "validation", fieldErrors: fieldErrorsOf(input.error) };
    const r = await updateProduct(db, admin, id.data, input.data);
    if (!r.ok) {
      return r.reason === "not_found" || r.reason === "category_not_found" || r.reason === "slug_taken"
        ? { ok: false, reason: r.reason }
        : { ok: false, reason: "failed" };
    }
    invalidateCatalog();
    await deleteReplacedImage(r.previousImageSrc, input.data.imageSrc);
    return { ok: true, id: id.data, slug: input.data.slug };
  } catch (err) {
    console.error("[admin] saveProductAction failed", { id: rawId }, err);
    return { ok: false, reason: "db_error" };
  }
}

/** Rename from the Products list (name only). */
export async function renameProductAction(raw: unknown): Promise<ProductActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, reason: "forbidden" };
  const parsed = z.object({ id: idSchema, name: productNameSchema }).safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "validation", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  try {
    const r = await renameProduct(db, admin, parsed.data.id, parsed.data.name);
    if (!r.ok) return { ok: false, reason: "not_found" };
    invalidateCatalog();
    return { ok: true, id: parsed.data.id };
  } catch (err) {
    console.error("[admin] renameProductAction failed", { id: parsed.data.id }, err);
    return { ok: false, reason: "db_error" };
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
  } catch (err) {
    console.error("[admin] archiveProductAction failed", { id: parsed.data.id }, err);
    return { ok: false, reason: "db_error" };
  }
}
