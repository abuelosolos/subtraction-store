// Admin data layer against a real Postgres (Neon test branch). Pure validation
// tests run everywhere; DB-backed ones are skipped unless TEST_DATABASE_URL is set.
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { adminAudit, orders, productSlugHistory, products, stockAdjustments } from "@/db/schema";
import {
  categoryCreateSchema,
  createCategory,
  createProduct,
  deleteCategory,
  isAllowedImageSrc,
  nairaToKobo,
  productCreateSchema,
  renameProduct,
  setProductArchived,
  updateProduct,
} from "@/lib/admin/catalogue";
import {
  fulfilmentInputSchema,
  getAdminOrder,
  listAdminOrders,
  parseOrderFilters,
  updateFulfilment,
} from "@/lib/admin/orders";
import { adjustStock, stockAdjustSchema } from "@/lib/admin/stock";
import { loadPricedProducts } from "@/lib/checkout";

import { createBranchFixtures, testUrl } from "./helpers/branch";

describe("admin validation (pure)", () => {
  it("converts naira to integer kobo and rejects bad prices", () => {
    expect(nairaToKobo("45000")).toBe(4_500_000);
    expect(nairaToKobo("1,250.5")).toBe(125_050);
    expect(nairaToKobo("0.99")).toBe(99);
    expect(nairaToKobo("10000000")).toBeNull();
    expect(nairaToKobo("-5")).toBeNull();
    expect(nairaToKobo("12.345")).toBeNull();
    expect(nairaToKobo("abc")).toBeNull();
  });

  it("only accepts local paths and Vercel Blob https URLs for images", () => {
    expect(isAllowedImageSrc("/images/products/tee.webp")).toBe(true);
    expect(isAllowedImageSrc("https://abc123.public.blob.vercel-storage.com/products/a.webp")).toBe(true);
    expect(isAllowedImageSrc("https://evil.example.com/a.webp")).toBe(false);
    expect(isAllowedImageSrc("//evil.example.com/a.webp")).toBe(false);
    expect(isAllowedImageSrc("/images/../secret")).toBe(false);
    expect(isAllowedImageSrc("javascript:alert(1)")).toBe(false);
    expect(isAllowedImageSrc("http://x.public.blob.vercel-storage.com/a.webp")).toBe(false);
  });

  const base = {
    slug: "Test-Tee",
    name: "Test tee",
    description: "d",
    categoryId: "3",
    price: "45000",
    sizes: "S, M, M, L",
    gender: "women",
    color: " Black ",
    collection: "",
    badge: "",
    isBestSeller: false,
    imageSrc: "/images/products/x.webp",
    imageWidth: 900,
    imageHeight: 1350,
    imageAlt: "A tee",
    initialStock: "5",
  };

  it("normalises a product: lowercases slug, dedupes sizes, price to kobo, ignores extra keys", () => {
    const r = productCreateSchema.parse({ ...base, currency: "USD", priceCents: 1 });
    expect(r.slug).toBe("test-tee");
    expect(r.sizes).toEqual(["S", "M", "L"]);
    expect(r.price).toBe(4_500_000);
    expect(r.badge).toBeNull();
    expect(r).toMatchObject({ gender: "women", color: "Black", collection: null });
    expect(r).not.toHaveProperty("currency");
    expect(r).not.toHaveProperty("priceCents");
  });

  it("rejects bad slugs, prices, images and stock", () => {
    expect(productCreateSchema.safeParse({ ...base, slug: "has space" }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...base, price: "free" }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...base, imageSrc: "https://evil.example/x.png" }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...base, initialStock: "-1" }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...base, gender: "robots" }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...base, color: "" }).success).toBe(false);
  });

  it("category image fields are all-or-none", () => {
    expect(categoryCreateSchema.safeParse({ slug: "caps", name: "Caps", sortOrder: "1" }).success).toBe(true);
    expect(
      categoryCreateSchema.safeParse({ slug: "caps", name: "Caps", sortOrder: "1", imageSrc: "/images/c.webp" }).success,
    ).toBe(false);
  });

  it("stock adjust schema: set needs expected; add can't be zero", () => {
    const ok = { productId: 1, reason: "restock" };
    expect(stockAdjustSchema.safeParse({ ...ok, mode: "add", amount: 5 }).success).toBe(true);
    expect(stockAdjustSchema.safeParse({ ...ok, mode: "add", amount: 0 }).success).toBe(false);
    expect(stockAdjustSchema.safeParse({ ...ok, mode: "set", amount: 5 }).success).toBe(false);
    expect(stockAdjustSchema.safeParse({ ...ok, mode: "set", amount: 5, expected: 2 }).success).toBe(true);
    expect(stockAdjustSchema.safeParse({ ...ok, mode: "set", amount: -1, expected: 2 }).success).toBe(false);
    expect(stockAdjustSchema.safeParse({ ...ok, mode: "add", amount: 5, reason: "gift" }).success).toBe(false);
  });

  it("order filters: unknown values are dropped and page is clamped", () => {
    const f = parseOrderFilters({ status: "hacked", fulfilment: "shipped", q: "  a\u0000b ", page: "-4" });
    expect(f).toEqual({ status: undefined, fulfilment: "shipped", q: "ab", page: 1 });
  });

  it("fulfilment input trims and nulls empty tracking", () => {
    const r = fulfilmentInputSchema.parse({ status: "shipped", trackingCarrier: " DHL ", trackingNumber: "", notes: "" });
    expect(r).toMatchObject({ status: "shipped", trackingCarrier: "DHL", trackingNumber: null, notes: null });
    expect(fulfilmentInputSchema.safeParse({ status: "teleported" }).success).toBe(false);
  });
});

describe.skipIf(!testUrl)("admin data layer (Neon test branch)", () => {
  const fx = createBranchFixtures();
  let admin: string;

  beforeAll(async () => {
    await fx.setup();
    admin = await fx.makeUser("admin", "admin");
  }, 60_000);
  afterAll(() => fx.cleanup(), 60_000);

  const auditCount = async (action: string, targetId: string) =>
    (
      await fx.db.select().from(adminAudit).where(eq(adminAudit.targetId, targetId))
    ).filter((a) => a.action === action).length;

  describe("stock adjustments", () => {
    it("adds units atomically and writes exactly one history row", async () => {
      const p = await fx.makeProduct("adj", 5);
      const r = await adjustStock(fx.db, admin, {
        productId: p.id, mode: "add", amount: 7, reason: "restock", note: null,
      });
      expect(r).toEqual({ ok: true, quantityAfter: 12, delta: 7 });
      expect(await fx.stockOf(p.id)).toBe(12);
      const rows = await fx.db.select().from(stockAdjustments).where(eq(stockAdjustments.productId, p.id));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ delta: 7, quantityAfter: 12, reason: "restock", actorUserId: admin });
    });

    it("refuses to go below zero and changes nothing", async () => {
      const p = await fx.makeProduct("neg", 3);
      const r = await adjustStock(fx.db, admin, {
        productId: p.id, mode: "add", amount: -4, reason: "damaged", note: null,
      });
      expect(r).toEqual({ ok: false, reason: "would_go_negative" });
      expect(await fx.stockOf(p.id)).toBe(3);
      expect(await fx.db.select().from(stockAdjustments).where(eq(stockAdjustments.productId, p.id))).toHaveLength(0);
    });

    it("set mode is compare-and-set: stale expectation is rejected", async () => {
      const p = await fx.makeProduct("cas", 10);
      await fx.db.execute(
        (await import("drizzle-orm")).sql`update stock set quantity = 8 where product_id = ${p.id}`,
      ); // a checkout happened after the admin loaded the page
      const stale = await adjustStock(fx.db, admin, {
        productId: p.id, mode: "set", amount: 20, expected: 10, reason: "correction", note: null,
      });
      expect(stale).toEqual({ ok: false, reason: "stale" });
      expect(await fx.stockOf(p.id)).toBe(8);

      const fresh = await adjustStock(fx.db, admin, {
        productId: p.id, mode: "set", amount: 20, expected: 8, reason: "correction", note: null,
      });
      expect(fresh).toEqual({ ok: true, quantityAfter: 20, delta: 12 });
    });

    it("no lost updates against concurrent checkout-style decrements", async () => {
      const p = await fx.makeProduct("race", 50);
      const { sql } = await import("drizzle-orm");
      const ops: Promise<unknown>[] = [];
      for (let i = 0; i < 10; i++) {
        ops.push(
          adjustStock(fx.db, admin, { productId: p.id, mode: "add", amount: 2, reason: "restock", note: null }),
          fx.db.execute(sql`update stock set quantity = quantity - 1 where product_id = ${p.id}`),
        );
      }
      await Promise.all(ops);
      expect(await fx.stockOf(p.id)).toBe(50 + 10 * 2 - 10);
      const rows = await fx.db.select().from(stockAdjustments).where(eq(stockAdjustments.productId, p.id));
      expect(rows).toHaveLength(10);
    }, 60_000);

    it("unknown product is not_found", async () => {
      const r = await adjustStock(fx.db, admin, {
        productId: 2_000_000_000, mode: "add", amount: 1, reason: "restock", note: null,
      });
      expect(r).toEqual({ ok: false, reason: "not_found" });
    });
  });

  describe("catalogue writes", () => {
    const input = (slug: string, categoryId: number) =>
      productCreateSchema.parse({
        slug, name: "Admin made", description: "d", categoryId, price: "1000",
        sizes: "S,M", badge: "", isBestSeller: false,
        gender: "men", color: "Black", collection: "Core",
        imageSrc: "/images/placeholder-product.svg", imageWidth: 10, imageHeight: 10, imageAlt: "x",
        initialStock: 4,
      });

    it("creates a product together with its stock row and an audit entry", async () => {
      const slug = `${fx.slugPrefix}-created`;
      const r = await createProduct(fx.db, { id: admin }, input(slug, fx.categoryId));
      expect(r).toEqual({ ok: true, slug });
      const [p] = await fx.db.select().from(products).where(eq(products.slug, slug));
      expect(p).toMatchObject({
        currency: "NGN", priceCents: 100_000, sizes: ["S", "M"], archivedAt: null,
        gender: "men", color: "Black", collection: "Core",
      });
      expect(await fx.stockOf(p.id)).toBe(4);
      expect(await auditCount("product.create", slug)).toBe(1);
    });

    it("rejects a duplicate slug and an unknown category without leaving a partial product", async () => {
      const slug = `${fx.slugPrefix}-dup`;
      await createProduct(fx.db, { id: admin }, input(slug, fx.categoryId));
      expect(await createProduct(fx.db, { id: admin }, input(slug, fx.categoryId))).toEqual({
        ok: false, reason: "slug_taken",
      });
      const orphan = `${fx.slugPrefix}-orphan`;
      expect(await createProduct(fx.db, { id: admin }, input(orphan, 2_000_000_000))).toEqual({
        ok: false, reason: "category_not_found",
      });
      expect(await fx.db.select().from(products).where(eq(products.slug, orphan))).toHaveLength(0);
    });

    it("updates fields, keeps the slug, and reports not_found", async () => {
      const slug = `${fx.slugPrefix}-upd`;
      await createProduct(fx.db, { id: admin }, input(slug, fx.categoryId));
      const [p] = await fx.db.select().from(products).where(eq(products.slug, slug));
      const { slug: _slug, initialStock: _stock, ...rest } = input(slug, fx.categoryId);
      void _slug; void _stock;
      expect(await updateProduct(fx.db, { id: admin }, p.id, { ...rest, name: "Renamed", price: 250_000 })).toMatchObject({ ok: true });
      const [after] = await fx.db.select().from(products).where(eq(products.id, p.id));
      expect(after).toMatchObject({ slug, name: "Renamed", priceCents: 250_000 });
      expect(await auditCount("product.update", slug)).toBe(1);
      expect(await updateProduct(fx.db, { id: admin }, 2_000_000_000, { ...rest })).toEqual({ ok: false, reason: "not_found" });
    });

    it("renames a product with its own audit row", async () => {
      const p = await fx.makeProduct("ren", 3);
      expect(await renameProduct(fx.db, { id: admin }, p.id, "Brand new name")).toEqual({ ok: true });
      const [after] = await fx.db.select().from(products).where(eq(products.id, p.id));
      expect(after.name).toBe("Brand new name");
      expect(await auditCount("product.rename", p.slug)).toBe(1);
      expect(await renameProduct(fx.db, { id: admin }, 2_000_000_000, "Nope")).toEqual({ ok: false, reason: "not_found" });
    });

    it("changing the slug keeps the old one as a redirect and still prices old-slug cart lines", async () => {
      const slug = `${fx.slugPrefix}-slugchg`;
      const next = `${fx.slugPrefix}-slugchg-new`;
      await createProduct(fx.db, { id: admin }, input(slug, fx.categoryId));
      const [p] = await fx.db.select().from(products).where(eq(products.slug, slug));
      const { slug: _s, initialStock: _i, ...rest } = input(slug, fx.categoryId);
      void _s; void _i;

      expect(await updateProduct(fx.db, { id: admin }, p.id, { ...rest, slug: next })).toMatchObject({ ok: true });
      const [after] = await fx.db.select().from(products).where(eq(products.id, p.id));
      expect(after.slug).toBe(next);
      const [hist] = await fx.db.select().from(productSlugHistory).where(eq(productSlugHistory.oldSlug, slug));
      expect(hist?.productId).toBe(p.id);

      // An old-slug cart line prices as the same product, under both slugs.
      const priced = await loadPricedProducts(fx.db, [slug]);
      expect(priced.get(slug)?.id).toBe(p.id);
      expect(priced.get(next)?.id).toBe(p.id);

      // Another product cannot take the new slug or the retired one.
      const other = await fx.makeProduct("slugother", 1);
      expect(await updateProduct(fx.db, { id: admin }, other.id, { ...rest, slug: next })).toEqual({ ok: false, reason: "slug_taken" });
      expect(await updateProduct(fx.db, { id: admin }, other.id, { ...rest, slug })).toEqual({ ok: false, reason: "slug_taken" });

      // Going back to the old slug drops its history row.
      expect(await updateProduct(fx.db, { id: admin }, p.id, { ...rest, slug })).toMatchObject({ ok: true });
      expect(await fx.db.select().from(productSlugHistory).where(eq(productSlugHistory.oldSlug, slug))).toHaveLength(0);
    });

    it("archived products are excluded from checkout pricing and can be restored", async () => {
      const p = await fx.makeProduct("arch", 5);
      expect((await loadPricedProducts(fx.db, [p.slug])).has(p.slug)).toBe(true);

      expect(await setProductArchived(fx.db, { id: admin }, p.id, true)).toEqual({ ok: true });
      expect((await loadPricedProducts(fx.db, [p.slug])).has(p.slug)).toBe(false);

      expect(await setProductArchived(fx.db, { id: admin }, p.id, false)).toEqual({ ok: true });
      expect((await loadPricedProducts(fx.db, [p.slug])).has(p.slug)).toBe(true);
    });

    it("cannot delete a category that still has products; can delete an empty one", async () => {
      const full = await createCategory(fx.db, { id: admin }, categoryCreateSchema.parse({
        slug: `${fx.slugPrefix}-full`, name: "Full", sortOrder: 0,
      }));
      expect(full.ok).toBe(true);
      const { categories } = await import("@/db/schema");
      const [cat] = await fx.db.select().from(categories).where(eq(categories.slug, `${fx.slugPrefix}-full`));
      await createProduct(fx.db, { id: admin }, input(`${fx.slugPrefix}-incat`, cat.id));

      expect(await deleteCategory(fx.db, { id: admin }, cat.id)).toEqual({ ok: false, reason: "in_use" });

      const empty = await createCategory(fx.db, { id: admin }, categoryCreateSchema.parse({
        slug: `${fx.slugPrefix}-empty`, name: "Empty", sortOrder: 0,
      }));
      expect(empty.ok).toBe(true);
      const [e] = await fx.db.select().from(categories).where(eq(categories.slug, `${fx.slugPrefix}-empty`));
      expect(await deleteCategory(fx.db, { id: admin }, e.id)).toEqual({ ok: true });
    });
  });

  describe("orders", () => {
    it("sets fulfilment only on paid orders and audits only real changes", async () => {
      const u = await fx.makeUser("cust");
      const p = await fx.makeProduct("ful", 20);
      const paid = await fx.makeOrder({ userId: u, items: [{ productId: p.id, quantity: 1 }], status: "paid" });
      const pending = await fx.makeOrder({ userId: u, items: [{ productId: p.id, quantity: 1 }], status: "pending" });
      const input = fulfilmentInputSchema.parse({
        status: "shipped", trackingCarrier: "DHL", trackingNumber: "ABC123", notes: "fragile",
      });

      expect(await updateFulfilment(fx.db, admin, paid.orderId, input)).toEqual({ ok: true });
      const [row] = await fx.db.select().from(orders).where(eq(orders.id, paid.orderId));
      expect(row).toMatchObject({
        fulfilmentStatus: "shipped", trackingCarrier: "DHL", trackingNumber: "ABC123", adminNotes: "fragile", status: "paid",
      });
      expect(row.shippedAt).not.toBeNull();
      expect(row.deliveredAt).toBeNull();
      expect(await auditCount("order.fulfilment", paid.orderId)).toBe(1);

      expect(await updateFulfilment(fx.db, admin, pending.orderId, input)).toEqual({
        ok: false, reason: "not_found_or_unpaid",
      });
      expect(await fx.orderStatus(pending.orderId)).toBe("pending");
      expect(await auditCount("order.fulfilment", pending.orderId)).toBe(0);
    });

    it("the database itself refuses a fulfilment status on an unpaid order", async () => {
      const u = await fx.makeUser("cust2");
      const p = await fx.makeProduct("chk", 5);
      const o = await fx.makeOrder({ userId: u, items: [{ productId: p.id, quantity: 1 }], status: "pending" });
      await expect(
        fx.db.update(orders).set({ fulfilmentStatus: "shipped" }).where(eq(orders.id, o.orderId)),
      ).rejects.toThrow();
    });

    it("admin order detail never exposes the payment link or access code", async () => {
      const u = await fx.makeUser("cust3");
      const p = await fx.makeProduct("pii", 5);
      const o = await fx.makeOrder({ userId: u, items: [{ productId: p.id, quantity: 1 }] });
      const detail = await getAdminOrder(fx.db, o.orderId);
      expect(detail?.payment).not.toBeNull();
      expect(detail?.payment).not.toHaveProperty("authorizationUrl");
      expect(detail?.payment).not.toHaveProperty("accessCode");
      expect(await getAdminOrder(fx.db, "00000000-0000-4000-8000-000000000000")).toBeNull();
    });

    it("lists with status/search filters and treats LIKE wildcards literally", async () => {
      const u = await fx.makeUser("lister");
      const p = await fx.makeProduct("list", 20);
      const a = await fx.makeOrder({ userId: u, items: [{ productId: p.id, quantity: 1 }], status: "paid" });
      await fx.makeOrder({ userId: u, items: [{ productId: p.id, quantity: 1 }], status: "pending" });

      const paidOnly = await listAdminOrders(fx.db, { status: "paid", q: a.orderId.slice(0, 8), page: 1 });
      expect(paidOnly.rows.map((r) => r.id)).toContain(a.orderId);
      expect(paidOnly.rows.every((r) => r.status === "paid")).toBe(true);

      const wildcard = await listAdminOrders(fx.db, { q: "%", page: 1 });
      expect(wildcard.total).toBe(0);
    }, 60_000);
  });
});
