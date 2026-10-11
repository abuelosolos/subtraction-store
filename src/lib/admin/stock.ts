import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { stockAdjustments } from "@/db/schema";
import { pgErrorCode, type Db } from "@/lib/order-lifecycle";

export const STOCK_REASONS = ["restock", "correction", "damaged", "returned", "other"] as const;
export const MAX_ADJUST = 100_000;

export const stockAdjustSchema = z
  .object({
    productId: z.coerce.number().int().positive(),
    mode: z.enum(["add", "set"]),
    /** `add`: units to add (negative removes). `set`: the new quantity. */
    amount: z.coerce.number().int().min(-MAX_ADJUST).max(MAX_ADJUST),
    /** The quantity the admin was looking at; required for `set` (compare-and-set). */
    expected: z.coerce.number().int().min(0).max(2_000_000_000).optional(),
    reason: z.enum(STOCK_REASONS),
    note: z
      .string()
      .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, "").trim())
      .pipe(z.string().max(300))
      .optional()
      .transform((s) => s || null),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "set") {
      if (v.expected === undefined) {
        ctx.addIssue({ code: "custom", path: ["expected"], message: "Reload the page and try again" });
      }
      if (v.amount < 0) {
        ctx.addIssue({ code: "custom", path: ["amount"], message: "Quantity can't be negative" });
      }
    } else if (v.amount === 0) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter a number other than 0" });
    }
  });
export type StockAdjustInput = z.output<typeof stockAdjustSchema>;

export type StockRow = {
  productId: number;
  name: string;
  slug: string;
  quantity: number;
  held: number;
  archived: boolean;
};

/** All products with available quantity and units currently held by unpaid orders. */
export async function listStockOverview(db: Db): Promise<StockRow[]> {
  const result = await db.execute(sql`
    select p.id as product_id, p.name, p.slug,
           coalesce(s.quantity, 0)::int as quantity,
           coalesce((
             select sum(oi.quantity) from order_items oi
             join orders o on o.id = oi.order_id
             where oi.product_id = p.id and o.status = 'pending'
           ), 0)::int as held,
           (p.archived_at is not null) as archived
    from products p
    left join stock s on s.product_id = p.id
    order by (p.archived_at is not null), coalesce(s.quantity, 0) asc, p.name asc
  `);
  return (result.rows as Record<string, unknown>[]).map((r) => ({
    productId: Number(r.product_id),
    name: String(r.name),
    slug: String(r.slug),
    quantity: Number(r.quantity),
    held: Number(r.held),
    archived: Boolean(r.archived),
  }));
}

export type AdjustResult =
  | { ok: true; quantityAfter: number; delta: number }
  | { ok: false; reason: "not_found" | "would_go_negative" | "stale" | "no_change" };

/**
 * Atomic stock change + audit row in ONE statement. The change is a relative
 * update (`quantity + delta`), so it composes with concurrent checkouts and
 * releases; the CHECK (quantity >= 0) blocks going negative. "Set" mode adds a
 * compare-and-set: it only applies if the quantity is still what the admin saw.
 */
export async function adjustStock(
  db: Db,
  actorUserId: string,
  input: StockAdjustInput,
): Promise<AdjustResult> {
  const delta = input.mode === "set" ? input.amount - (input.expected as number) : input.amount;
  if (delta === 0) return { ok: false, reason: "no_change" };
  const expected = input.mode === "set" ? (input.expected as number) : null;

  try {
    const result = await db.execute(sql`
      with u as (
        update stock
        set quantity = quantity + ${delta}::int, updated_at = now()
        where product_id = ${input.productId}::int
          and (${expected}::int is null or quantity = ${expected}::int)
        returning product_id, quantity
      ),
      a as (
        insert into stock_adjustments (product_id, delta, quantity_after, reason, note, actor_user_id)
        select product_id, ${delta}::int, quantity, ${input.reason}, ${input.note}, ${actorUserId}
        from u
        returning id
      )
      select (select quantity from u)::int as quantity_after, (select count(*) from u)::int as updated
    `);
    const row = result.rows[0] as { quantity_after: number | null; updated: number };
    if (Number(row.updated) === 1) {
      return { ok: true, quantityAfter: Number(row.quantity_after), delta };
    }
  } catch (err) {
    if (pgErrorCode(err) === "23514") return { ok: false, reason: "would_go_negative" };
    throw err;
  }

  // Nothing updated: either the product has no stock row, or the compare failed.
  const [exists] = (
    await db.execute(sql`select 1 as x from stock where product_id = ${input.productId}::int`)
  ).rows;
  return { ok: false, reason: exists && expected !== null ? "stale" : "not_found" };
}

export async function listStockHistory(db: Db, productId: number, limit = 20) {
  return db
    .select({
      id: stockAdjustments.id,
      delta: stockAdjustments.delta,
      quantityAfter: stockAdjustments.quantityAfter,
      reason: stockAdjustments.reason,
      note: stockAdjustments.note,
      createdAt: stockAdjustments.createdAt,
    })
    .from(stockAdjustments)
    .where(eq(stockAdjustments.productId, productId))
    .orderBy(desc(stockAdjustments.createdAt))
    .limit(limit);
}
