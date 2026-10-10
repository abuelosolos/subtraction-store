// startCheckout against a real Postgres (Neon test branch), with Paystack
// replaced by an injected `initialize`. Skipped unless TEST_DATABASE_URL is set.
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { addresses, orderItems, orders, payments } from "@/db/schema";
import { startCheckout } from "@/lib/checkout";
import type { DeliveryDetails } from "@/lib/customer";
import { PaystackError, type InitializeInput } from "@/lib/paystack";
import { SHIPPING_DOMESTIC_KOBO, SHIPPING_INTERNATIONAL_KOBO } from "@/lib/pricing";

import { createBranchFixtures, testUrl } from "./helpers/branch";

const delivery: DeliveryDetails = {
  fullName: "Ada Obi",
  phone: "+2348031234567",
  line1: "12 Marina Road",
  line2: undefined,
  city: "Lagos",
  region: undefined,
  postalCode: undefined,
  country: "NG",
};

const okInitialize = async (i: InitializeInput) => ({
  authorizationUrl: `https://checkout.paystack.test/${i.reference}`,
  accessCode: "ac_test",
  reference: i.reference,
});

describe.skipIf(!testUrl)("startCheckout (Neon test branch)", () => {
  const fx = createBranchFixtures();
  let userId: string;
  let otherUserId: string;
  const callbackUrl = "https://shop.test/checkout/callback";

  beforeAll(async () => {
    await fx.setup();
    userId = await fx.makeUser("buyer");
    otherUserId = await fx.makeUser("other");
  }, 60_000);

  afterAll(() => fx.cleanup(), 60_000);

  const user = () => ({ id: userId, email: "buyer@example.com" });

  it("prices from the database, reserves stock and starts Paystack for the stored total", async () => {
    const p = await fx.makeProduct("happy", 5, { priceCents: 250_000 });
    const initialize = vi.fn(okInitialize);

    const result = await startCheckout(
      fx.db,
      { user: user(), lines: [{ slug: p.slug, quantity: 2 }], delivery, callbackUrl },
      { initialize },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [order] = await fx.db.select().from(orders).where(eq(orders.id, result.orderId));
    expect(order).toMatchObject({
      userId,
      email: "buyer@example.com",
      customerName: "Ada Obi",
      customerPhone: "+2348031234567",
      status: "pending",
      currency: "NGN",
      subtotalKobo: 500_000,
      shippingKobo: SHIPPING_DOMESTIC_KOBO,
      totalKobo: 500_000 + SHIPPING_DOMESTIC_KOBO,
    });
    expect(order.shippingAddress).toMatchObject({ line1: "12 Marina Road", country: "NG" });

    const items = await fx.db.select().from(orderItems).where(eq(orderItems.orderId, result.orderId));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ unitPriceKobo: 250_000, quantity: 2, lineTotalKobo: 500_000 });

    const payment = await fx.paymentRow(result.reference);
    expect(payment).toMatchObject({
      amountKobo: order.totalKobo,
      status: "pending",
      authorizationUrl: result.authorizationUrl,
      accessCode: "ac_test",
    });

    expect(await fx.stockOf(p.id)).toBe(3);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize.mock.calls[0][0]).toMatchObject({
      email: "buyer@example.com",
      amountKobo: order.totalKobo,
      currency: "NGN",
      reference: result.reference,
      callbackUrl,
      metadata: { order_id: result.orderId },
    });
  });

  it("charges the international rate for a non-NG address", async () => {
    const p = await fx.makeProduct("intl", 5);
    const result = await startCheckout(
      fx.db,
      {
        user: user(),
        lines: [{ slug: p.slug, quantity: 1 }],
        delivery: { ...delivery, country: "GB", phone: "+447911123456" },
        callbackUrl,
      },
      { initialize: okInitialize },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [order] = await fx.db.select().from(orders).where(eq(orders.id, result.orderId));
    expect(order.shippingKobo).toBe(SHIPPING_INTERNATIONAL_KOBO);
  });

  it("rejects an invalid cart without creating anything or holding stock", async () => {
    const p = await fx.makeProduct("bad", 2);
    const before = (await fx.db.select().from(orders).where(eq(orders.userId, userId))).length;

    const tooMany = await startCheckout(
      fx.db,
      { user: user(), lines: [{ slug: p.slug, quantity: 3 }], delivery, callbackUrl },
      { initialize: okInitialize },
    );
    const unknown = await startCheckout(
      fx.db,
      { user: user(), lines: [{ slug: "no-such-product", quantity: 1 }], delivery, callbackUrl },
      { initialize: okInitialize },
    );
    const negative = await startCheckout(
      fx.db,
      { user: user(), lines: [{ slug: p.slug, quantity: -1 }], delivery, callbackUrl },
      { initialize: okInitialize },
    );

    for (const r of [tooMany, unknown, negative]) {
      expect(r).toMatchObject({ ok: false, reason: "invalid_cart" });
    }
    expect(await fx.stockOf(p.id)).toBe(2);
    expect((await fx.db.select().from(orders).where(eq(orders.userId, userId))).length).toBe(before);
  });

  it("only one of two buyers gets the last unit", async () => {
    const p = await fx.makeProduct("last", 1);
    const lines = [{ slug: p.slug, quantity: 1 }];
    const buyer2 = await fx.makeUser("buyer2");

    const [a, b] = await Promise.all([
      startCheckout(fx.db, { user: user(), lines, delivery, callbackUrl }, { initialize: okInitialize }),
      startCheckout(
        fx.db,
        { user: { id: buyer2, email: "b2@example.com" }, lines, delivery, callbackUrl },
        { initialize: okInitialize },
      ),
    ]);

    const outcomes = [a, b].map((r) => (r.ok ? "ok" : r.reason));
    expect(outcomes.filter((o) => o === "ok")).toHaveLength(1);
    // The loser either fails the pre-check (invalid_cart) or the reserve (sold_out).
    const loser = outcomes.find((o) => o !== "ok");
    expect(["invalid_cart", "sold_out"]).toContain(loser);
    expect(await fx.stockOf(p.id)).toBe(0);
  });

  it("releases the user's older pending order when they check out again", async () => {
    const p = await fx.makeProduct("retry", 5);
    const lines = [{ slug: p.slug, quantity: 2 }];
    const first = await startCheckout(
      fx.db,
      { user: user(), lines, delivery, callbackUrl },
      { initialize: okInitialize },
    );
    expect(first.ok).toBe(true);
    expect(await fx.stockOf(p.id)).toBe(3);

    const second = await startCheckout(
      fx.db,
      { user: user(), lines, delivery, callbackUrl },
      { initialize: okInitialize },
    );
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(await fx.orderStatus(first.orderId)).toBe("expired");
    expect(await fx.orderStatus(second.orderId)).toBe("pending");
    expect(await fx.stockOf(p.id)).toBe(3); // 5, minus only the live reservation
  });

  it("marks the order failed and restocks when Paystack initialize fails", async () => {
    const p = await fx.makeProduct("down", 5);
    const initialize = vi.fn().mockRejectedValue(new PaystackError("Could not reach Paystack", true));

    const result = await startCheckout(
      fx.db,
      { user: user(), lines: [{ slug: p.slug, quantity: 2 }], delivery, callbackUrl },
      { initialize },
    );

    expect(result).toEqual({ ok: false, reason: "payment_unavailable", transient: true });
    expect(await fx.stockOf(p.id)).toBe(5);
    const [row] = await fx.db
      .select({ s: orders.status })
      .from(orders)
      .innerJoin(payments, eq(payments.orderId, orders.id))
      .where(eq(orders.userId, userId))
      .orderBy(orders.createdAt)
      .limit(100)
      .then((rows) => rows.slice(-1));
    expect(row.s).toBe("failed");
  });

  it("uses a saved address only if it belongs to the user", async () => {
    const p = await fx.makeProduct("saved", 5);
    const [mine] = await fx.db
      .insert(addresses)
      .values({
        userId,
        recipientName: "Ada Obi",
        phone: "+2348031234567",
        line1: "1 My Street",
        city: "Abuja",
        country: "NG",
        isDefault: true,
      })
      .returning({ id: addresses.id });
    const [theirs] = await fx.db
      .insert(addresses)
      .values({
        userId: otherUserId,
        recipientName: "Someone Else",
        phone: "+2348039999999",
        line1: "9 Their Street",
        city: "Kano",
        country: "NG",
        isDefault: true,
      })
      .returning({ id: addresses.id });
    const lines = [{ slug: p.slug, quantity: 1 }];

    const own = await startCheckout(
      fx.db,
      { user: user(), lines, savedAddressId: mine.id, callbackUrl },
      { initialize: okInitialize },
    );
    const stolen = await startCheckout(
      fx.db,
      { user: user(), lines, savedAddressId: theirs.id, callbackUrl },
      { initialize: okInitialize },
    );

    expect(own.ok).toBe(true);
    if (own.ok) {
      const [order] = await fx.db.select().from(orders).where(eq(orders.id, own.orderId));
      expect(order.shippingAddress).toMatchObject({ line1: "1 My Street", city: "Abuja" });
    }
    expect(stolen).toEqual({ ok: false, reason: "address_not_found" });
  });

  it("saves the address once when asked, as the default", async () => {
    const p = await fx.makeProduct("save", 5);
    const fresh = await fx.makeUser("saver");

    const result = await startCheckout(
      fx.db,
      {
        user: { id: fresh, email: "saver@example.com" },
        lines: [{ slug: p.slug, quantity: 1 }],
        delivery,
        saveAddress: true,
        callbackUrl,
      },
      { initialize: okInitialize },
    );
    expect(result.ok).toBe(true);

    const rows = await fx.db.select().from(addresses).where(eq(addresses.userId, fresh));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ line1: "12 Marina Road", isDefault: true, country: "NG" });
  });
});
