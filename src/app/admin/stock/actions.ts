"use server";

import { db } from "@/db";
import { fieldErrorsOf } from "@/lib/admin/errors";
import { adjustStock, stockAdjustSchema } from "@/lib/admin/stock";
import { invalidateCatalog } from "@/lib/cache";
import { getAdminUser } from "@/lib/session";

export type StockActionResult =
  | { ok: true; quantityAfter: number; delta: number }
  | { ok: false; reason: "forbidden" | "not_found" | "would_go_negative" | "stale" | "no_change" | "failed" }
  | { ok: false; reason: "validation"; fieldErrors: Record<string, string> };

export async function adjustStockAction(raw: unknown): Promise<StockActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, reason: "forbidden" };

  const parsed = stockAdjustSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "validation", fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    const r = await adjustStock(db, admin.id, parsed.data);
    if (r.ok) invalidateCatalog();
    return r;
  } catch {
    return { ok: false, reason: "failed" };
  }
}
