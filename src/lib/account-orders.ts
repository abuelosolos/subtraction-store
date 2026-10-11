import { and, desc, eq, ne, sql } from "drizzle-orm";

import { orders } from "@/db/schema";
import type { Db } from "@/lib/order-lifecycle";

export type AccountOrder = {
  id: string;
  status: string;
  fulfilmentStatus: string;
  currency: string;
  totalKobo: number;
  itemCount: number;
  createdAt: Date;
};

/**
 * The signed-in user's orders, newest first. `failed` orders (payment never
 * started) are hidden; everything else is shown with an honest status.
 */
export async function getOrdersForUser(
  db: Db,
  userId: string,
  limit = 50,
): Promise<AccountOrder[]> {
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      fulfilmentStatus: orders.fulfilmentStatus,
      currency: orders.currency,
      totalKobo: orders.totalKobo,
      createdAt: orders.createdAt,
      // Qualified by hand: Drizzle prints `${orders.id}` unqualified in a
      // single-table select, which would bind to order_items.id in here.
      itemCount: sql<number>`(
        select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = "orders"."id"
      )`,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), ne(orders.status, "failed")))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, itemCount: Number(r.itemCount) }));
}
