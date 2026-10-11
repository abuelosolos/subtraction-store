"use server";

import { z } from "zod";

import { db } from "@/db";
import {
  categoryCreateSchema,
  categoryInputSchema,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/admin/catalogue";
import { fieldErrorsOf } from "@/lib/admin/errors";
import { invalidateCatalog } from "@/lib/cache";
import { getAdminUser } from "@/lib/session";

export type CategoryActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: "forbidden" | "not_found" | "slug_taken" | "in_use" | "protected" | "failed";
    }
  | { ok: false; reason: "validation"; fieldErrors: Record<string, string> };

const idSchema = z.coerce.number().int().positive();

export async function saveCategoryAction(raw: unknown): Promise<CategoryActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, reason: "forbidden" };

  const rawId = (raw as { id?: unknown } | null)?.id;
  try {
    if (rawId === undefined || rawId === null || rawId === "") {
      const input = categoryCreateSchema.safeParse(raw);
      if (!input.success) return { ok: false, reason: "validation", fieldErrors: fieldErrorsOf(input.error) };
      const r = await createCategory(db, admin, input.data);
      if (!r.ok) return { ok: false, reason: r.reason === "slug_taken" ? "slug_taken" : "failed" };
    } else {
      const id = idSchema.safeParse(rawId);
      const input = categoryInputSchema.safeParse(raw);
      if (!id.success) return { ok: false, reason: "not_found" };
      if (!input.success) return { ok: false, reason: "validation", fieldErrors: fieldErrorsOf(input.error) };
      const r = await updateCategory(db, admin, id.data, input.data);
      if (!r.ok) return { ok: false, reason: "not_found" };
    }
    invalidateCatalog();
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function deleteCategoryAction(raw: unknown): Promise<CategoryActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, reason: "forbidden" };
  const id = idSchema.safeParse((raw as { id?: unknown } | null)?.id);
  if (!id.success) return { ok: false, reason: "not_found" };
  try {
    const r = await deleteCategory(db, admin, id.data);
    if (!r.ok) {
      return r.reason === "in_use" || r.reason === "protected" || r.reason === "not_found"
        ? { ok: false, reason: r.reason }
        : { ok: false, reason: "failed" };
    }
    invalidateCatalog();
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
