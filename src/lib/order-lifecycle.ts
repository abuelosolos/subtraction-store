import { and, eq, inArray, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

import { orders, payments } from "@/db/schema";
import type * as schema from "@/db/schema";
import { verifyTransaction, type VerifiedTransaction } from "@/lib/paystack";

export type Db = NeonHttpDatabase<typeof schema>;

/** Postgres error code from a Neon/Drizzle error, wherever it is nested. */
export function pgErrorCode(err: unknown): string | undefined {
  let e = err as { code?: string; cause?: unknown } | undefined;
  for (let i = 0; i < 4 && e; i++) {
    if (typeof e.code === "string") return e.code;
    e = e.cause as typeof e;
  }
  return undefined;
}

/** CHECK constraint violation, i.e. the stock CHECK quantity >= 0. */
export const isCheckViolation = (err: unknown) => pgErrorCode(err) === "23514";

/**
 * Moves a `pending` order to `expired`/`failed` and returns its reserved stock,
 * in ONE statement. Only the call that wins the status flip restocks, so a
 * crash cannot leak stock and a repeat call cannot restock twice. Returns true
 * for the winner.
 */
export async function releaseOrder(
  db: Db,
  orderId: string,
  to: "expired" | "failed",
): Promise<boolean> {
  const result = await db.execute(sql`
    with flipped as (
      update orders
      set status = ${to}::order_status, updated_at = now()
      where id = ${orderId}::uuid and status = 'pending'
      returning id
    ),
    restocked as (
      update stock s
      set quantity = s.quantity + i.qty, updated_at = now()
      from (
        select oi.product_id, sum(oi.quantity)::int as qty
        from order_items oi
        join flipped f on f.id = oi.order_id
        group by oi.product_id
      ) i
      where s.product_id = i.product_id
      returning s.product_id
    )
    select (select count(*) from flipped)::int as flipped
  `);
  return Number((result.rows[0] as { flipped: number }).flipped) === 1;
}

export type ConfirmResult =
  | { status: "paid"; orderId: string; firstTime: boolean }
  | { status: "pending"; orderId: string }
  | { status: "failed"; orderId: string }
  | { status: "mismatch"; orderId: string }
  | { status: "not_found" };

export type ConfirmDeps = {
  verify?: (reference: string) => Promise<VerifiedTransaction>;
};

/**
 * The only place an order becomes `paid`. Used by the callback page, the
 * webhook and the reconcile job, so they cannot disagree or double-process.
 *
 * Never trusts input: it looks the payment up by reference in OUR database,
 * asks Paystack for the transaction, and requires status, reference, amount and
 * currency to match our order. `opts.userId` restricts to that user's order
 * (callback); webhook and cron omit it.
 */
export async function confirmPayment(
  db: Db,
  reference: string,
  opts: { userId?: string } = {},
  deps: ConfirmDeps = {},
): Promise<ConfirmResult> {
  const verify = deps.verify ?? verifyTransaction;

  const [row] = await db
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(eq(payments.reference, reference))
    .limit(1);

  if (!row || (opts.userId && row.order.userId !== opts.userId)) {
    return { status: "not_found" };
  }
  const { payment, order } = row;

  // Terminal states need no API call.
  if (order.status === "paid" || order.status === "refunded") {
    return { status: "paid", orderId: order.id, firstTime: false };
  }
  if (order.status === "payment_mismatch") return { status: "mismatch", orderId: order.id };
  if (order.status === "failed") return { status: "failed", orderId: order.id };

  // `pending` or `expired` (a late payment): ask Paystack.
  const tx = await verify(reference);

  if (tx.status !== "success") {
    if (tx.status === "failed") {
      await db
        .update(payments)
        .set({ status: "failed", gatewayResponse: tx.gatewayResponse, updatedAt: sql`now()` })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
      return { status: "failed", orderId: order.id };
    }
    // abandoned / ongoing / pending / queued: not decided yet.
    return { status: "pending", orderId: order.id };
  }

  const matches =
    tx.reference === payment.reference &&
    tx.amountKobo === payment.amountKobo &&
    tx.amountKobo === order.totalKobo &&
    tx.currency === order.currency &&
    tx.currency === payment.currency;

  if (!matches) {
    await db.batch([
      db
        .update(payments)
        .set({
          status: "mismatch",
          providerTransactionId: tx.transactionId,
          gatewayResponse: tx.gatewayResponse,
          verifiedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(payments.id, payment.id)),
      db
        .update(orders)
        .set({ status: "payment_mismatch", updatedAt: sql`now()` })
        .where(and(eq(orders.id, order.id), inArray(orders.status, ["pending", "expired"]))),
    ]);
    return { status: "mismatch", orderId: order.id };
  }

  const markPayment = () =>
    db
      .update(payments)
      .set({
        status: "success",
        providerTransactionId: tx.transactionId,
        gatewayResponse: tx.gatewayResponse,
        verifiedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(payments.id, payment.id));

  if (order.status === "pending") {
    const [claimed] = await db.batch([
      db
        .update(orders)
        .set({ status: "paid", paidAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
        .returning({ id: orders.id }),
      markPayment(),
    ]);
    return { status: "paid", orderId: order.id, firstTime: claimed.length === 1 };
  }

  // `expired`: stock was already returned, so re-take it. If it has been sold
  // in the meantime the CHECK aborts the statement and a human must refund.
  try {
    const result = await db.execute(sql`
      with claimed as (
        update orders
        set status = 'paid', paid_at = now(), updated_at = now()
        where id = ${order.id}::uuid and status = 'expired'
        returning id
      ),
      taken as (
        update stock s
        set quantity = s.quantity - i.qty, updated_at = now()
        from (
          select oi.product_id, sum(oi.quantity)::int as qty
          from order_items oi
          join claimed c on c.id = oi.order_id
          group by oi.product_id
        ) i
        where s.product_id = i.product_id
        returning s.product_id
      )
      select (select count(*) from claimed)::int as claimed
    `);
    await markPayment();
    const firstTime = Number((result.rows[0] as { claimed: number }).claimed) === 1;
    return { status: "paid", orderId: order.id, firstTime };
  } catch (err) {
    if (!isCheckViolation(err)) throw err;
    await db.batch([
      db
        .update(payments)
        .set({
          status: "mismatch",
          providerTransactionId: tx.transactionId,
          verifiedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(payments.id, payment.id)),
      db
        .update(orders)
        .set({ status: "payment_mismatch", updatedAt: sql`now()` })
        .where(and(eq(orders.id, order.id), eq(orders.status, "expired"))),
    ]);
    return { status: "mismatch", orderId: order.id };
  }
}
