import { timingSafeEqual } from "node:crypto";

import { and, eq, lt } from "drizzle-orm";

import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { invalidateCatalog } from "@/lib/cache";
import { confirmPayment, releaseOrder } from "@/lib/order-lifecycle";

const BATCH = 50;
/** Give an in-flight payment a few minutes before we go looking for it. */
const GRACE_MS = 3 * 60_000;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

/**
 * Resolves pending orders whose webhook/callback never arrived: confirms the
 * ones Paystack says were paid, and expires (and restocks) the ones past their
 * reservation window. Safe to run repeatedly and concurrently.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });

  const cutoff = new Date(Date.now() - GRACE_MS);
  const stale = await db
    .select({
      orderId: orders.id,
      expiresAt: orders.expiresAt,
      reference: payments.reference,
    })
    .from(orders)
    .innerJoin(payments, eq(payments.orderId, orders.id))
    .where(and(eq(orders.status, "pending"), lt(orders.createdAt, cutoff)))
    .limit(BATCH);

  const summary = { checked: stale.length, paid: 0, expired: 0, stillPending: 0, errors: 0 };

  for (const row of stale) {
    try {
      const result = await confirmPayment(db, row.reference);
      if (result.status === "paid") {
        summary.paid++;
      } else if (row.expiresAt.getTime() <= Date.now()) {
        if (await releaseOrder(db, row.orderId, "expired")) summary.expired++;
      } else {
        summary.stillPending++;
      }
    } catch {
      summary.errors++; // transient Paystack/DB error: the next run retries
    }
  }

  if (summary.expired > 0 || summary.paid > 0) invalidateCatalog();
  return Response.json(summary);
}
