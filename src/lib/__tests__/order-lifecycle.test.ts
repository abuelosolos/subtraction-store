// Payment confirmation and release against a real Postgres (Neon test branch).
// Skipped unless TEST_DATABASE_URL is set. Paystack is replaced by an injected
// `verify`, so no network and no keys are involved.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { confirmPayment, releaseOrder } from "@/lib/order-lifecycle";
import type { VerifiedTransaction } from "@/lib/paystack";

import { createBranchFixtures, testUrl } from "./helpers/branch";

// Paystack transaction ids are unique per payment, and so is the DB column.
let nextTransactionId = Date.now() % 1_000_000_000;
const verified = (
  over: Partial<VerifiedTransaction> & Pick<VerifiedTransaction, "reference" | "amountKobo">,
): VerifiedTransaction => ({
  status: "success",
  currency: "NGN",
  transactionId: String(nextTransactionId++),
  gatewayResponse: "Successful",
  ...over,
});

describe.skipIf(!testUrl)("order lifecycle (Neon test branch)", () => {
  const fx = createBranchFixtures();
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    await fx.setup();
    userId = await fx.makeUser("buyer");
    otherUserId = await fx.makeUser("other");
  }, 60_000);

  afterAll(() => fx.cleanup(), 60_000);

  describe("confirmPayment", () => {
    it("marks a matching successful payment paid exactly once", async () => {
      const p = await fx.makeProduct("confirm", 5);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 2 }] });
      const tx = verified({ reference: o.reference, amountKobo: o.totalKobo });
      const verify = vi.fn(async () => tx);

      const first = await confirmPayment(fx.db, o.reference, { userId }, { verify });
      const second = await confirmPayment(fx.db, o.reference, { userId }, { verify });

      expect(first).toEqual({ status: "paid", orderId: o.orderId, firstTime: true });
      expect(second).toEqual({ status: "paid", orderId: o.orderId, firstTime: false });
      expect(verify).toHaveBeenCalledTimes(1); // terminal state skips the API
      expect(await fx.orderStatus(o.orderId)).toBe("paid");
      expect(await fx.stockOf(p.id)).toBe(3); // reserved at checkout, not changed again
      const payment = await fx.paymentRow(o.reference);
      expect(payment.status).toBe("success");
      expect(payment.providerTransactionId).toBe(tx.transactionId);
    });

    it("only one of many concurrent confirmations is first", async () => {
      const p = await fx.makeProduct("race", 5);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 1 }] });
      const verify = async () => verified({ reference: o.reference, amountKobo: o.totalKobo });

      const results = await Promise.all(
        Array.from({ length: 6 }, () => confirmPayment(fx.db, o.reference, {}, { verify })),
      );

      const firsts = results.filter((r) => r.status === "paid" && r.firstTime);
      expect(firsts).toHaveLength(1);
      expect(results.every((r) => r.status === "paid")).toBe(true);
      expect(await fx.orderStatus(o.orderId)).toBe("paid");
    });

    it("flags a different amount as mismatch and does not mark paid", async () => {
      const p = await fx.makeProduct("amount", 5);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 1 }] });
      const verify = async () => verified({ reference: o.reference, amountKobo: o.totalKobo - 1 });

      const result = await confirmPayment(fx.db, o.reference, {}, { verify });

      expect(result.status).toBe("mismatch");
      expect(await fx.orderStatus(o.orderId)).toBe("payment_mismatch");
      expect((await fx.paymentRow(o.reference)).status).toBe("mismatch");
    });

    it("flags a different currency and a different reference as mismatch", async () => {
      const p = await fx.makeProduct("currency", 5);
      const a = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 1 }] });
      const wrongCurrency = await confirmPayment(
        fx.db,
        a.reference,
        {},
        { verify: async () => verified({ reference: a.reference, amountKobo: a.totalKobo, currency: "USD" }) },
      );
      expect(wrongCurrency.status).toBe("mismatch");

      const b = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 1 }] });
      const wrongReference = await confirmPayment(
        fx.db,
        b.reference,
        {},
        { verify: async () => verified({ reference: "SUB-someone-else", amountKobo: b.totalKobo }) },
      );
      expect(wrongReference.status).toBe("mismatch");
      expect(await fx.orderStatus(b.orderId)).toBe("payment_mismatch");
    });

    it("leaves the order pending while Paystack has not decided", async () => {
      const p = await fx.makeProduct("undecided", 5);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 1 }] });
      const verify = async () =>
        verified({ reference: o.reference, amountKobo: o.totalKobo, status: "abandoned" });

      const result = await confirmPayment(fx.db, o.reference, {}, { verify });

      expect(result).toEqual({ status: "pending", orderId: o.orderId });
      expect(await fx.orderStatus(o.orderId)).toBe("pending");
    });

    it("records a failed charge on the payment, order stays pending", async () => {
      const p = await fx.makeProduct("declined", 5);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 1 }] });
      const verify = async () =>
        verified({ reference: o.reference, amountKobo: o.totalKobo, status: "failed", gatewayResponse: "Declined" });

      const result = await confirmPayment(fx.db, o.reference, {}, { verify });

      expect(result.status).toBe("failed");
      expect((await fx.paymentRow(o.reference)).status).toBe("failed");
      expect(await fx.orderStatus(o.orderId)).toBe("pending");
    });

    it("treats another user's reference, or an unknown one, as not found without calling Paystack", async () => {
      const p = await fx.makeProduct("owner", 5);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 1 }] });
      const verify = vi.fn();

      const asOther = await confirmPayment(fx.db, o.reference, { userId: otherUserId }, { verify });
      const unknown = await confirmPayment(fx.db, "SUB-does-not-exist", {}, { verify });

      expect(asOther).toEqual({ status: "not_found" });
      expect(unknown).toEqual({ status: "not_found" });
      expect(verify).not.toHaveBeenCalled();
    });
  });

  describe("late payment on an expired order", () => {
    it("re-takes stock and marks paid when stock is still there", async () => {
      const p = await fx.makeProduct("late-ok", 5);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 2 }] });
      expect(await releaseOrder(fx.db, o.orderId, "expired")).toBe(true);
      expect(await fx.stockOf(p.id)).toBe(5);

      const verify = async () => verified({ reference: o.reference, amountKobo: o.totalKobo });
      const result = await confirmPayment(fx.db, o.reference, {}, { verify });

      expect(result).toEqual({ status: "paid", orderId: o.orderId, firstTime: true });
      expect(await fx.stockOf(p.id)).toBe(3);
    });

    it("goes to payment_mismatch for manual refund when stock was sold meanwhile", async () => {
      const p = await fx.makeProduct("late-gone", 1);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 1 }] });
      await releaseOrder(fx.db, o.orderId, "expired");
      // Someone else buys the unit.
      await fx.makeOrder({ userId: otherUserId, items: [{ productId: p.id, quantity: 1 }] });
      expect(await fx.stockOf(p.id)).toBe(0);

      const verify = async () => verified({ reference: o.reference, amountKobo: o.totalKobo });
      const result = await confirmPayment(fx.db, o.reference, {}, { verify });

      expect(result.status).toBe("mismatch");
      expect(await fx.orderStatus(o.orderId)).toBe("payment_mismatch");
      expect(await fx.stockOf(p.id)).toBe(0); // never negative
    });
  });

  describe("releaseOrder", () => {
    it("restocks once, even when called repeatedly or concurrently", async () => {
      const p = await fx.makeProduct("release", 5);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 3 }] });
      expect(await fx.stockOf(p.id)).toBe(2);

      const results = await Promise.all(
        Array.from({ length: 5 }, () => releaseOrder(fx.db, o.orderId, "expired")),
      );

      expect(results.filter(Boolean)).toHaveLength(1);
      expect(await fx.stockOf(p.id)).toBe(5);
      expect(await fx.orderStatus(o.orderId)).toBe("expired");
    });

    it("restocks the sum when one product appears on several lines", async () => {
      const p = await fx.makeProduct("sizes", 10, { sizes: ["S", "M"] });
      const o = await fx.makeOrder({
        userId,
        items: [
          { productId: p.id, quantity: 2, size: "S" },
          { productId: p.id, quantity: 3, size: "M" },
        ],
      });
      expect(await fx.stockOf(p.id)).toBe(5);

      await releaseOrder(fx.db, o.orderId, "failed");

      expect(await fx.stockOf(p.id)).toBe(10);
      expect(await fx.orderStatus(o.orderId)).toBe("failed");
    });

    it("does not touch stock for an order that is already paid", async () => {
      const p = await fx.makeProduct("paid-stays", 5);
      const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 2 }], status: "paid" });

      expect(await releaseOrder(fx.db, o.orderId, "expired")).toBe(false);
      expect(await fx.stockOf(p.id)).toBe(3);
      expect(await fx.orderStatus(o.orderId)).toBe("paid");
    });
  });
});
