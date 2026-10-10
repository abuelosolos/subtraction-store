// Proves the reservation design against a real Postgres: a `db.batch` that
// inserts an order and decrements stock must abort as a whole when stock would
// go negative (the existing CHECK quantity >= 0), and must never oversell
// under concurrency.
//
// Runs ONLY against TEST_DATABASE_URL (a Neon branch). Skipped when unset, and
// the suite fails loudly if it points at the same database as DATABASE_URL.
// It creates its own `test-` fixtures and deletes them afterwards; it never
// reads or changes real catalogue stock.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { eq, inArray, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

config({ path: ".env.local" });
config();

const testUrl = process.env.TEST_DATABASE_URL;
const mainUrl = process.env.DATABASE_URL;

const identity = (url: string) => {
  const u = new URL(url);
  return `${u.hostname}${u.pathname}`;
};

if (testUrl && mainUrl && identity(testUrl) === identity(mainUrl)) {
  throw new Error(
    "Refusing to run: TEST_DATABASE_URL points at the same database as DATABASE_URL. Use a Neon branch.",
  );
}

const { orders, orderItems, products, stock, categories, user } = schema;

const RUN = randomUUID().slice(0, 8);
const SLUG_PREFIX = `test-spike-${RUN}`;
const USER_ID = `test-user-${RUN}`;

type BatchDb = ReturnType<typeof drizzle<typeof schema>>;

/** Postgres error code from a Neon/Drizzle error, wherever it is nested. */
const pgCode = (err: unknown): string | undefined => {
  let e = err as { code?: string; cause?: unknown } | undefined;
  for (let i = 0; i < 4 && e; i++) {
    if (typeof e.code === "string") return e.code;
    e = e.cause as typeof e;
  }
  return undefined;
};

describe.skipIf(!testUrl)("reservation batch (Neon test branch)", () => {
  let db: BatchDb;
  let categoryId: number;
  const productIds: number[] = [];

  async function makeProduct(name: string, quantity: number) {
    const [p] = await db
      .insert(products)
      .values({
        slug: `${SLUG_PREFIX}-${name}`,
        name: `Test ${name}`,
        categoryId,
        priceCents: 100_000,
        currency: "NGN",
        imageSrc: "/images/placeholder-product.svg",
        imageWidth: 10,
        imageHeight: 10,
        imageAlt: "test",
      })
      .returning({ id: products.id });
    await db.insert(stock).values({ productId: p.id, quantity });
    productIds.push(p.id);
    return p.id;
  }

  const stockOf = async (productId: number) =>
    (await db.select({ q: stock.quantity }).from(stock).where(eq(stock.productId, productId)))[0].q;

  const orderCount = async () =>
    (await db.select({ id: orders.id }).from(orders).where(eq(orders.userId, USER_ID))).length;

  /** The same shape the checkout reserve will use: order + items + decrements, one batch. */
  function reserve(lines: { productId: number; quantity: number }[]) {
    const orderId = randomUUID();
    const unit = 100_000;
    const subtotal = lines.reduce((n, l) => n + l.quantity * unit, 0);
    return db.batch([
      db.insert(orders).values({
        id: orderId,
        userId: USER_ID,
        email: "test@example.com",
        customerName: "Test",
        customerPhone: "+2348000000000",
        currency: "NGN",
        subtotalKobo: subtotal,
        shippingKobo: 0,
        totalKobo: subtotal,
        shippingAddress: {},
        expiresAt: new Date(Date.now() + 30 * 60_000),
      }),
      db.insert(orderItems).values(
        lines.map((l) => ({
          orderId,
          productId: l.productId,
          name: "Test",
          slug: "test",
          unitPriceKobo: unit,
          quantity: l.quantity,
          lineTotalKobo: unit * l.quantity,
        })),
      ),
      ...lines.map((l) =>
        db
          .update(stock)
          .set({ quantity: sql`${stock.quantity} - ${l.quantity}`, updatedAt: sql`now()` })
          .where(eq(stock.productId, l.productId)),
      ),
    ]);
  }

  beforeAll(async () => {
    db = drizzle(neon(testUrl!), { schema });

    const missing = await db.execute(
      sql`select 1 from information_schema.columns where table_name = 'orders' and column_name = 'customer_name'`,
    );
    if (missing.rows.length === 0) {
      throw new Error(
        "Test branch is missing migration 0003. Recreate the branch from main after migrating, or migrate it.",
      );
    }

    await db.insert(user).values({
      id: USER_ID,
      name: "Test",
      email: `${USER_ID}@example.com`,
    });
    const [c] = await db
      .insert(categories)
      .values({ slug: `${SLUG_PREFIX}-cat`, name: "Test category" })
      .returning({ id: categories.id });
    categoryId = c.id;
  }, 60_000);

  afterAll(async () => {
    if (!db) return;
    // orders first (cascades order_items), then products/stock, category, user.
    await db.delete(orders).where(eq(orders.userId, USER_ID));
    if (productIds.length > 0) {
      await db.delete(stock).where(inArray(stock.productId, productIds));
      await db.delete(products).where(inArray(products.id, productIds));
    }
    await db.delete(products).where(like(products.slug, `${SLUG_PREFIX}%`));
    await db.delete(categories).where(like(categories.slug, `${SLUG_PREFIX}%`));
    await db.delete(user).where(eq(user.id, USER_ID));
  }, 60_000);

  it("reserves stock and creates the order in one batch", async () => {
    const id = await makeProduct("happy", 3);
    await reserve([{ productId: id, quantity: 2 }]);
    expect(await stockOf(id)).toBe(1);
    expect(await orderCount()).toBe(1);
  });

  it("aborts the whole batch on oversell: no order, stock unchanged, code 23514", async () => {
    const before = await orderCount();
    const id = await makeProduct("oversell", 1);

    const error = await reserve([{ productId: id, quantity: 2 }]).then(
      () => null,
      (e: unknown) => e,
    );

    expect(error).not.toBeNull();
    expect(pgCode(error)).toBe("23514");
    expect(await stockOf(id)).toBe(1);
    expect(await orderCount()).toBe(before);
  });

  it("rolls back earlier lines when a later line oversells", async () => {
    const before = await orderCount();
    const plenty = await makeProduct("multi-ok", 5);
    const scarce = await makeProduct("multi-scarce", 1);

    const error = await reserve([
      { productId: plenty, quantity: 2 },
      { productId: scarce, quantity: 2 },
    ]).then(
      () => null,
      (e: unknown) => e,
    );

    expect(pgCode(error)).toBe("23514");
    expect(await stockOf(plenty)).toBe(5); // first decrement was rolled back
    expect(await stockOf(scarce)).toBe(1);
    expect(await orderCount()).toBe(before);
  });

  it("never oversells under 20 concurrent single-unit buyers on stock 5", async () => {
    const before = await orderCount();
    const id = await makeProduct("race", 5);

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => reserve([{ productId: id, quantity: 1 }])),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(15);
    for (const r of rejected) expect(pgCode(r.reason)).toBe("23514");
    expect(await stockOf(id)).toBe(0);
    expect(await orderCount()).toBe(before + 5);
  }, 60_000);
});
