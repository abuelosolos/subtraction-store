// Shared setup for tests that need a real Postgres. Connects ONLY to
// TEST_DATABASE_URL (a Neon branch) and refuses to run if it is the same
// database as DATABASE_URL. Creates `test-` fixtures and removes them.
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { eq, inArray, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { randomUUID } from "node:crypto";

import * as schema from "@/db/schema";
import type { Db } from "@/lib/order-lifecycle";

config({ path: ".env.local" });
config();

export const testUrl = process.env.TEST_DATABASE_URL;
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

const { orders, orderItems, payments, products, stock, categories, user, addresses, stockAdjustments, adminAudit } = schema;

export function createBranchFixtures() {
  const run = randomUUID().slice(0, 8);
  const slugPrefix = `test-${run}`;
  const userIds: string[] = [];
  const productIds: number[] = [];
  let db!: Db;
  let categoryId = 0;

  return {
    get db() {
      return db;
    },
    get categoryId() {
      return categoryId;
    },
    get slugPrefix() {
      return slugPrefix;
    },

    async setup() {
      db = drizzle(neon(testUrl!), { schema });
      const missing = await db.execute(
        sql`select 1 from information_schema.columns where table_name = 'orders' and column_name = 'customer_name'`,
      );
      if (missing.rows.length === 0) {
        throw new Error("Test branch is missing migration 0003; migrate the branch.");
      }
      const admin = await db.execute(
        sql`select 1 from information_schema.columns where table_name = 'products' and column_name = 'archived_at'`,
      );
      if (admin.rows.length === 0) {
        throw new Error("Test branch is missing migration 0005; migrate the branch.");
      }
      const [c] = await db
        .insert(categories)
        .values({ slug: `${slugPrefix}-cat`, name: "Test category" })
        .returning({ id: categories.id });
      categoryId = c.id;
    },

    async makeUser(label = "u", role: "user" | "admin" = "user") {
      const id = `${slugPrefix}-${label}-${randomUUID().slice(0, 6)}`;
      await db.insert(user).values({ id, name: "Test", email: `${id}@example.com`, role });
      userIds.push(id);
      return id;
    },

    async makeProduct(name: string, quantity: number, over: { sizes?: string[]; priceCents?: number } = {}) {
      const slug = `${slugPrefix}-${name}-${randomUUID().slice(0, 4)}`;
      const [p] = await db
        .insert(products)
        .values({
          slug,
          name: `Test ${name}`,
          categoryId,
          priceCents: over.priceCents ?? 100_000,
          currency: "NGN",
          imageSrc: "/images/placeholder-product.svg",
          imageWidth: 10,
          imageHeight: 10,
          imageAlt: "test",
          sizes: over.sizes ?? [],
        })
        .returning({ id: products.id });
      await db.insert(stock).values({ productId: p.id, quantity });
      productIds.push(p.id);
      return { id: p.id, slug };
    },

    async stockOf(productId: number) {
      const [row] = await db.select({ q: stock.quantity }).from(stock).where(eq(stock.productId, productId));
      return row.q;
    },

    /**
     * An order as checkout would leave it: stock already decremented, one
     * payment row. `status` defaults to pending.
     */
    async makeOrder(opts: {
      userId: string;
      items: { productId: number; quantity: number; size?: string | null }[];
      totalKobo?: number;
      status?: (typeof orders.$inferInsert)["status"];
      decrementStock?: boolean;
      reference?: string;
    }) {
      const orderId = randomUUID();
      const reference = opts.reference ?? `SUB-${randomUUID()}`;
      const unit = 100_000;
      const subtotal = opts.items.reduce((n, i) => n + i.quantity * unit, 0);
      const total = opts.totalKobo ?? subtotal;

      await db.insert(orders).values({
        id: orderId,
        userId: opts.userId,
        email: "test@example.com",
        customerName: "Test",
        customerPhone: "+2348000000000",
        status: opts.status ?? "pending",
        currency: "NGN",
        subtotalKobo: total,
        shippingKobo: 0,
        totalKobo: total,
        shippingAddress: {},
        expiresAt: new Date(Date.now() + 30 * 60_000),
      });
      await db.insert(orderItems).values(
        opts.items.map((i) => ({
          orderId,
          productId: i.productId,
          name: "Test",
          slug: "test",
          size: i.size ?? null,
          unitPriceKobo: unit,
          quantity: i.quantity,
          lineTotalKobo: unit * i.quantity,
        })),
      );
      await db.insert(payments).values({
        orderId,
        reference,
        amountKobo: total,
        currency: "NGN",
      });
      if (opts.decrementStock !== false) {
        for (const i of opts.items) {
          await db
            .update(stock)
            .set({ quantity: sql`${stock.quantity} - ${i.quantity}` })
            .where(eq(stock.productId, i.productId));
        }
      }
      return { orderId, reference, totalKobo: total };
    },

    async orderStatus(orderId: string) {
      const [row] = await db.select({ s: orders.status }).from(orders).where(eq(orders.id, orderId));
      return row?.s;
    },

    async paymentRow(reference: string) {
      const [row] = await db.select().from(payments).where(eq(payments.reference, reference));
      return row;
    },

    async cleanup() {
      if (!db) return;
      // Admin history references products and users with RESTRICT; clear it first.
      await db.execute(sql`
        delete from stock_adjustments
        where product_id in (select id from products where slug like ${slugPrefix + "%"})
      `);
      if (userIds.length > 0) {
        await db.delete(stockAdjustments).where(inArray(stockAdjustments.actorUserId, userIds));
        await db.delete(adminAudit).where(inArray(adminAudit.actorUserId, userIds));
      }
      await db.delete(adminAudit).where(like(adminAudit.targetId, `${slugPrefix}%`));
      if (userIds.length > 0) {
        // payments restrict order deletion, so remove them first.
        const orderRows = await db
          .select({ id: orders.id })
          .from(orders)
          .where(inArray(orders.userId, userIds));
        const orderIds = orderRows.map((o) => o.id);
        if (orderIds.length > 0) {
          await db.delete(payments).where(inArray(payments.orderId, orderIds));
          await db.delete(orders).where(inArray(orders.id, orderIds)); // cascades items
        }
        await db.delete(addresses).where(inArray(addresses.userId, userIds));
      }
      if (productIds.length > 0) {
        await db.delete(stock).where(inArray(stock.productId, productIds));
        await db.delete(products).where(inArray(products.id, productIds));
      }
      await db.delete(products).where(like(products.slug, `${slugPrefix}%`));
      await db.delete(categories).where(like(categories.slug, `${slugPrefix}%`));
      if (userIds.length > 0) await db.delete(user).where(inArray(user.id, userIds));
    },
  };
}
