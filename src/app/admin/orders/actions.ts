"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { auditInsert } from "@/lib/admin/audit";
import { fulfilmentInputSchema, updateFulfilment } from "@/lib/admin/orders";
import { invalidateCatalog } from "@/lib/cache";
import { confirmPayment } from "@/lib/order-lifecycle";
import { getAdminUser } from "@/lib/session";

export type OrderActionResult =
  | { ok: true; note?: string }
  | { ok: false; reason: "forbidden" | "not_found" | "not_allowed" | "failed" }
  | { ok: false; reason: "validation"; fieldErrors: Record<string, string> };

const idSchema = z.uuid();

export async function updateFulfilmentAction(raw: unknown): Promise<OrderActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, reason: "forbidden" };

  const orderId = idSchema.safeParse((raw as { orderId?: unknown } | null)?.orderId);
  const input = fulfilmentInputSchema.safeParse(raw);
  if (!orderId.success) return { ok: false, reason: "not_found" };
  if (!input.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of input.error.issues) {
      fieldErrors[issue.path.join(".") || "form"] ??= issue.message;
    }
    return { ok: false, reason: "validation", fieldErrors };
  }

  const result = await updateFulfilment(db, admin.id, orderId.data, input.data);
  return result.ok ? { ok: true } : { ok: false, reason: "not_allowed" };
}

/**
 * Ask Paystack again about an unpaid order. Goes through `confirmPayment`, the
 * only place an order becomes paid, so an admin can never mark one paid by hand.
 */
export async function recheckPaymentAction(raw: unknown): Promise<OrderActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { ok: false, reason: "forbidden" };

  const orderId = idSchema.safeParse((raw as { orderId?: unknown } | null)?.orderId);
  if (!orderId.success) return { ok: false, reason: "not_found" };

  const [row] = await db
    .select({ reference: payments.reference, status: orders.status })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(eq(orders.id, orderId.data))
    .limit(1);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status !== "pending" && row.status !== "expired") return { ok: false, reason: "not_allowed" };

  try {
    const result = await confirmPayment(db, row.reference);
    await auditInsert(db, {
      actorUserId: admin.id,
      action: "order.recheck_payment",
      targetType: "order",
      targetId: orderId.data,
      detail: { result: result.status },
    });
    invalidateCatalog();
    const note =
      result.status === "paid"
        ? "Payment confirmed with Paystack."
        : result.status === "pending"
          ? "Paystack has no successful payment for this order yet."
          : result.status === "mismatch"
            ? "Paystack reports a payment that doesn't match the order. Review it in the dashboard."
            : "Paystack reports the payment failed.";
    return { ok: true, note };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
