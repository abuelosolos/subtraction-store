// Address book and account orders against a real Postgres (Neon test branch).
// Skipped unless TEST_DATABASE_URL is set.
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addresses, orders } from "@/db/schema";
import { getOrdersForUser } from "@/lib/account-orders";
import {
  MAX_SAVED_ADDRESSES,
  createAddress,
  deleteAddress,
  getSavedAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
} from "@/lib/addresses";
import { startCheckout } from "@/lib/checkout";

import { createBranchFixtures, testUrl } from "./helpers/branch";

const input = (over: Partial<AddressInput> = {}): AddressInput => ({
  fullName: "Ada Obi",
  phone: "+2348031234567",
  line1: "12 Marina Road",
  city: "Lagos",
  country: "NG",
  ...over,
});

describe.skipIf(!testUrl)("address book (Neon test branch)", () => {
  const fx = createBranchFixtures();

  beforeAll(() => fx.setup(), 60_000);
  afterAll(() => fx.cleanup(), 60_000);

  const defaultsOf = async (userId: string) =>
    (await getSavedAddresses(fx.db, userId)).filter((a) => a.isDefault);

  it("makes the first address the default and later ones not", async () => {
    const u = await fx.makeUser("first");
    const a = await createAddress(fx.db, u, input({ line1: "1 First St" }));
    const b = await createAddress(fx.db, u, input({ line1: "2 Second St" }));

    expect(a.ok && a.address.isDefault).toBe(true);
    expect(b.ok && b.address.isDefault).toBe(false);
    expect(await defaultsOf(u)).toHaveLength(1);
  });

  it("can create straight as default, replacing the old default atomically", async () => {
    const u = await fx.makeUser("makedefault");
    await createAddress(fx.db, u, input({ line1: "Old default" }));
    const b = await createAddress(fx.db, u, input({ line1: "New default" }), { makeDefault: true });

    expect(b.ok && b.address.isDefault).toBe(true);
    const defaults = await defaultsOf(u);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].line1).toBe("New default");
  });

  it("enforces the cap of saved addresses", async () => {
    const u = await fx.makeUser("cap");
    for (let i = 0; i < MAX_SAVED_ADDRESSES; i++) {
      const r = await createAddress(fx.db, u, input({ line1: `${i} Cap Street` }));
      expect(r.ok).toBe(true);
    }
    const over = await createAddress(fx.db, u, input({ line1: "One too many" }));
    expect(over).toEqual({ ok: false, reason: "limit_reached" });
    expect(await getSavedAddresses(fx.db, u)).toHaveLength(MAX_SAVED_ADDRESSES);
  });

  it("updates an address in place, including clearing optional fields", async () => {
    const u = await fx.makeUser("update");
    const created = await createAddress(
      fx.db,
      u,
      input({ line2: "Flat 3", region: "Lagos", postalCode: "100001", label: "Home" }),
    );
    if (!created.ok) throw new Error("setup failed");

    const updated = await updateAddress(
      fx.db,
      u,
      created.address.id,
      input({ line1: "99 New Road", city: "Abuja", line2: undefined, label: undefined, phone: "+2348039999999" }),
    );

    expect(updated.ok).toBe(true);
    const [row] = await getSavedAddresses(fx.db, u);
    expect(row).toMatchObject({
      id: created.address.id,
      line1: "99 New Road",
      city: "Abuja",
      phone: "+2348039999999",
      line2: null,
      label: null,
      isDefault: true,
    });
  });

  it("switches the default atomically and never leaves two", async () => {
    const u = await fx.makeUser("switch");
    const a = await createAddress(fx.db, u, input({ line1: "A" }));
    const b = await createAddress(fx.db, u, input({ line1: "B" }));
    if (!a.ok || !b.ok) throw new Error("setup failed");

    const result = await setDefaultAddress(fx.db, u, b.address.id);

    expect(result.ok && result.address.isDefault).toBe(true);
    const defaults = await defaultsOf(u);
    expect(defaults.map((d) => d.id)).toEqual([b.address.id]);
  });

  it("promotes the newest remaining address when the default is deleted", async () => {
    const u = await fx.makeUser("delete");
    const a = await createAddress(fx.db, u, input({ line1: "Oldest" }));
    await createAddress(fx.db, u, input({ line1: "Middle" }));
    const c = await createAddress(fx.db, u, input({ line1: "Newest" }));
    if (!a.ok || !c.ok) throw new Error("setup failed");
    expect(a.address.isDefault).toBe(true);

    expect(await deleteAddress(fx.db, u, a.address.id)).toEqual({ ok: true });

    const rows = await getSavedAddresses(fx.db, u);
    expect(rows).toHaveLength(2);
    const defaults = rows.filter((r) => r.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(c.address.id);
  });

  it("deleting a non-default address leaves the default alone", async () => {
    const u = await fx.makeUser("delete2");
    const a = await createAddress(fx.db, u, input({ line1: "Default" }));
    const b = await createAddress(fx.db, u, input({ line1: "Other" }));
    if (!a.ok || !b.ok) throw new Error("setup failed");

    await deleteAddress(fx.db, u, b.address.id);

    const rows = await getSavedAddresses(fx.db, u);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: a.address.id, isDefault: true });
  });

  it("deleting the only address leaves none and no error", async () => {
    const u = await fx.makeUser("only");
    const a = await createAddress(fx.db, u, input());
    if (!a.ok) throw new Error("setup failed");
    expect(await deleteAddress(fx.db, u, a.address.id)).toEqual({ ok: true });
    expect(await getSavedAddresses(fx.db, u)).toEqual([]);
  });

  it("treats another user's address as not found for update, default and delete", async () => {
    const owner = await fx.makeUser("owner");
    const attacker = await fx.makeUser("attacker");
    const mine = await createAddress(fx.db, owner, input({ line1: "Owner's home" }));
    if (!mine.ok) throw new Error("setup failed");
    const id = mine.address.id;

    expect(await updateAddress(fx.db, attacker, id, input({ line1: "Hijacked" }))).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await setDefaultAddress(fx.db, attacker, id)).toEqual({ ok: false, reason: "not_found" });
    expect(await deleteAddress(fx.db, attacker, id)).toEqual({ ok: false, reason: "not_found" });

    const [row] = await getSavedAddresses(fx.db, owner);
    expect(row).toMatchObject({ id, line1: "Owner's home", isDefault: true });
    expect(await getSavedAddresses(fx.db, attacker)).toEqual([]);
  });

  it("does not change an existing order when its source address is edited or deleted", async () => {
    const u = await fx.makeUser("snapshot");
    const p = await fx.makeProduct("snap", 5);
    const saved = await createAddress(fx.db, u, input({ line1: "7 Original Lane", city: "Lagos" }));
    if (!saved.ok) throw new Error("setup failed");

    const result = await startCheckout(
      fx.db,
      {
        user: { id: u, email: "snap@example.com" },
        lines: [{ slug: p.slug, quantity: 1 }],
        savedAddressId: saved.address.id,
        callbackUrl: "https://shop.test/checkout/callback",
      },
      {
        initialize: async (i) => ({
          authorizationUrl: `https://checkout.paystack.test/${i.reference}`,
          accessCode: "ac",
          reference: i.reference,
        }),
      },
    );
    if (!result.ok) throw new Error("checkout failed");

    await updateAddress(fx.db, u, saved.address.id, input({ line1: "500 Changed Avenue", city: "Kano" }));
    await deleteAddress(fx.db, u, saved.address.id);

    const [order] = await fx.db.select().from(orders).where(eq(orders.id, result.orderId));
    expect(order.shippingAddress).toMatchObject({ line1: "7 Original Lane", city: "Lagos" });
    expect(await fx.db.select().from(addresses).where(eq(addresses.id, saved.address.id))).toHaveLength(0);
  });
});

describe.skipIf(!testUrl)("account orders list (Neon test branch)", () => {
  const fx = createBranchFixtures();

  beforeAll(() => fx.setup(), 60_000);
  afterAll(() => fx.cleanup(), 60_000);

  it("returns only the user's orders, newest first, hiding failed ones", async () => {
    const me = await fx.makeUser("me");
    const someoneElse = await fx.makeUser("else");
    const p = await fx.makeProduct("orders", 50);

    const older = await fx.makeOrder({ userId: me, items: [{ productId: p.id, quantity: 2 }], status: "paid" });
    const failed = await fx.makeOrder({ userId: me, items: [{ productId: p.id, quantity: 1 }], status: "failed" });
    const newer = await fx.makeOrder({
      userId: me,
      items: [
        { productId: p.id, quantity: 1 },
        { productId: p.id, quantity: 3, size: "M" },
      ],
      status: "pending",
    });
    const theirs = await fx.makeOrder({ userId: someoneElse, items: [{ productId: p.id, quantity: 1 }] });

    // Make "newer" strictly newer.
    await fx.db
      .update(orders)
      .set({ createdAt: new Date(Date.now() + 60_000) })
      .where(eq(orders.id, newer.orderId));

    const list = await getOrdersForUser(fx.db, me);
    const ids = list.map((o) => o.id);

    expect(ids).toEqual([newer.orderId, older.orderId]);
    expect(ids).not.toContain(failed.orderId);
    expect(ids).not.toContain(theirs.orderId);
    expect(list[0]).toMatchObject({ status: "pending", itemCount: 4, currency: "NGN" });
    expect(list[1]).toMatchObject({ status: "paid", itemCount: 2 });
  });
});
