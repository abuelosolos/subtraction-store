import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { orderItems, orders, payments, webhookEvents } from "@/db/schema";
import { LOW_STOCK_THRESHOLD } from "@/lib/catalog";
import { FULFILMENT_STEPS } from "@/lib/order-labels";
import type { Db } from "@/lib/order-lifecycle";

export const ORDERS_PAGE_SIZE = 25;

const ORDER_STATUSES = ["pending", "paid", "expired", "failed", "payment_mismatch", "refunded"] as const;

export type AdminOrderFilters = {
  status?: (typeof ORDER_STATUSES)[number];
  fulfilment?: (typeof FULFILMENT_STEPS)[number];
  q?: string;
  page: number;
};

/** Parse untrusted search params into safe filters. */
export function parseOrderFilters(raw: Record<string, string | string[] | undefined>): AdminOrderFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const status = z.enum(ORDER_STATUSES).safeParse(one(raw.status));
  const fulfilment = z.enum(FULFILMENT_STEPS).safeParse(one(raw.fulfilment));
  const q = (one(raw.q) ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one(raw.page) ?? "1", 10) || 1));
  return {
    status: status.success ? status.data : undefined,
    fulfilment: fulfilment.success ? fulfilment.data : undefined,
    q: q || undefined,
    page,
  };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export type AdminOrderRow = {
  id: string;
  email: string;
  customerName: string;
  status: string;
  fulfilmentStatus: string;
  currency: string;
  totalKobo: number;
  createdAt: Date;
  itemCount: number;
};

export async function listAdminOrders(db: Db, filters: AdminOrderFilters) {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.fulfilment) conditions.push(eq(orders.fulfilmentStatus, filters.fulfilment));
  if (filters.q) {
    const like = `%${escapeLike(filters.q)}%`;
    conditions.push(
      sql`(${orders.email} ilike ${like} or ${orders.customerName} ilike ${like} or ${orders.id}::text ilike ${like})`,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: orders.id,
        email: orders.email,
        customerName: orders.customerName,
        status: orders.status,
        fulfilmentStatus: orders.fulfilmentStatus,
        currency: orders.currency,
        totalKobo: orders.totalKobo,
        createdAt: orders.createdAt,
        // Qualified by hand: Drizzle prints unqualified columns in a single-table select.
        itemCount: sql<number>`(
          select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = "orders"."id"
        )`,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(ORDERS_PAGE_SIZE)
      .offset((filters.page - 1) * ORDERS_PAGE_SIZE),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where),
  ]);

  return {
    rows: rows.map((r) => ({ ...r, itemCount: Number(r.itemCount) })) as AdminOrderRow[],
    total: Number(n),
    pageSize: ORDERS_PAGE_SIZE,
  };
}

/**
 * Everything the admin order page shows. Payment columns are whitelisted:
 * `authorization_url` and `access_code` are live payment links and never leave
 * the database through the admin.
 */
export async function getAdminOrder(db: Db, id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;

  const [items, [payment]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db
      .select({
        reference: payments.reference,
        providerTransactionId: payments.providerTransactionId,
        status: payments.status,
        amountKobo: payments.amountKobo,
        currency: payments.currency,
        gatewayResponse: payments.gatewayResponse,
        verifiedAt: payments.verifiedAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.orderId, id))
      .limit(1),
  ]);

  const events = payment
    ? await db
        .select({
          id: webhookEvents.id,
          eventType: webhookEvents.eventType,
          receivedAt: webhookEvents.receivedAt,
          processedAt: webhookEvents.processedAt,
          error: webhookEvents.error,
        })
        .from(webhookEvents)
        .where(eq(webhookEvents.reference, payment.reference))
        .orderBy(desc(webhookEvents.receivedAt))
        .limit(20)
    : [];

  return { order, items, payment: payment ?? null, events };
}

/** Counts for the overview page. Uncached on purpose. */
export async function getAttentionCounts(db: Db) {
  const [row] = (
    await db.execute(sql`
      select
        (select count(*) from orders where status = 'payment_mismatch')::int as mismatch,
        (select count(*) from orders where status = 'paid' and fulfilment_status = 'unfulfilled')::int as to_fulfil,
        (select count(*) from orders where status = 'pending')::int as pending,
        (select count(*) from stock s join products p on p.id = s.product_id
           where p.archived_at is null and s.quantity <= ${LOW_STOCK_THRESHOLD})::int as low_stock
    `)
  ).rows as { mismatch: number; to_fulfil: number; pending: number; low_stock: number }[];
  return {
    mismatch: Number(row.mismatch),
    toFulfil: Number(row.to_fulfil),
    pending: Number(row.pending),
    lowStock: Number(row.low_stock),
  };
}

export const fulfilmentInputSchema = z.object({
  status: z.enum(FULFILMENT_STEPS),
  trackingCarrier: z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(60))
    .optional()
    .transform((s) => s || null),
  trackingNumber: z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(100))
    .optional()
    .transform((s) => s || null),
  notes: z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(2000))
    .optional()
    .transform((s) => s || null),
});
export type FulfilmentInput = z.output<typeof fulfilmentInputSchema>;

/**
 * Set shipping progress. One statement: the UPDATE only matches a `paid`
 * order, and the audit row is written from the updated row, so a no-op never
 * logs. Never touches `status` or payments.
 */
export async function updateFulfilment(
  db: Db,
  actorUserId: string,
  orderId: string,
  input: FulfilmentInput,
): Promise<{ ok: true } | { ok: false; reason: "not_found_or_unpaid" }> {
  const result = await db.execute(sql`
    with u as (
      update orders
      set fulfilment_status = ${input.status}::fulfilment_status,
          tracking_carrier = ${input.trackingCarrier},
          tracking_number = ${input.trackingNumber},
          admin_notes = ${input.notes},
          shipped_at = case
            when ${input.status} in ('shipped', 'delivered') then coalesce(shipped_at, now())
            else null end,
          delivered_at = case
            when ${input.status} = 'delivered' then coalesce(delivered_at, now())
            else null end,
          updated_at = now()
      where id = ${orderId}::uuid and status = 'paid'
      returning id
    ),
    a as (
      insert into admin_audit (actor_user_id, action, target_type, target_id, detail)
      select ${actorUserId}, 'order.fulfilment', 'order', u.id::text,
             jsonb_build_object('status', ${input.status}::text, 'tracking_number', ${input.trackingNumber}::text)
      from u
      returning id
    )
    select (select count(*) from u)::int as updated
  `);
  const updated = Number((result.rows[0] as { updated: number }).updated);
  return updated === 1 ? { ok: true } : { ok: false, reason: "not_found_or_unpaid" };
}

