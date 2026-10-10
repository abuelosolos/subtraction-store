// Exercises the real webhook route handler. `@/db` is swapped for the Neon
// test branch and Paystack's verify API is mocked, so nothing here touches the
// main database or the network. Skipped unless TEST_DATABASE_URL is set.
import { createHmac } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { webhookEvents } from "@/db/schema";
import { PaystackError, verifyTransaction } from "@/lib/paystack";

import { createBranchFixtures, testUrl } from "./helpers/branch";

vi.mock("@/db", async () => {
  await import("./helpers/branch"); // loads env and enforces the main-DB guard
  if (!process.env.TEST_DATABASE_URL) return { db: undefined };
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const schema = await import("@/db/schema");
  return { db: drizzle(neon(process.env.TEST_DATABASE_URL), { schema }) };
});

vi.mock("@/lib/cache", () => ({ invalidateCatalog: vi.fn() }));

vi.mock("@/lib/paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paystack")>();
  return { ...actual, verifyTransaction: vi.fn() };
});

const KEY = "sk_test_webhook_key";
const sign = (body: string, key = KEY) => createHmac("sha512", key).update(body).digest("hex");

const post = async (body: string, signature: string | null) => {
  const { POST } = await import("@/app/api/paystack/webhook/route");
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("x-paystack-signature", signature);
  return POST(new Request("http://localhost/api/paystack/webhook", { method: "POST", body, headers }));
};

let txCounter = Date.now() % 1_000_000_000;

describe.skipIf(!testUrl)("POST /api/paystack/webhook (Neon test branch)", () => {
  const fx = createBranchFixtures();
  let userId: string;
  const references: string[] = [];

  const eventRows = (reference: string) =>
    fx.db.select().from(webhookEvents).where(eq(webhookEvents.reference, reference));

  const chargeSuccess = (reference: string, id: number, amount: number, extra = {}) =>
    JSON.stringify({
      event: "charge.success",
      data: {
        id,
        reference,
        status: "success",
        amount,
        currency: "NGN",
        paid_at: "2026-10-10T12:00:00.000Z",
        gateway_response: "Successful",
        customer: { email: "secret@example.com", phone: "+2348000000000" },
        authorization: { last4: "4081", bin: "408408" },
        ...extra,
      },
    });

  const newOrder = async (name: string) => {
    const p = await fx.makeProduct(name, 5);
    const o = await fx.makeOrder({ userId, items: [{ productId: p.id, quantity: 1 }] });
    references.push(o.reference);
    return o;
  };

  const mockVerify = (reference: string, over: Partial<Awaited<ReturnType<typeof verifyTransaction>>> = {}, amountKobo?: number) =>
    vi.mocked(verifyTransaction).mockResolvedValue({
      status: "success",
      reference,
      amountKobo: amountKobo ?? 0,
      currency: "NGN",
      transactionId: String(txCounter++),
      gatewayResponse: "Successful",
      ...over,
    });

  beforeAll(async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", KEY);
    await fx.setup();
    userId = await fx.makeUser("wh");
  }, 60_000);

  beforeEach(() => {
    vi.mocked(verifyTransaction).mockReset();
  });

  afterAll(async () => {
    if (references.length > 0) {
      await fx.db.delete(webhookEvents).where(inArray(webhookEvents.reference, references));
    }
    await fx.cleanup();
  }, 60_000);

  it("rejects missing, invalid and tampered signatures before touching anything", async () => {
    const o = await newOrder("sig");
    const body = chargeSuccess(o.reference, 1, o.totalKobo);
    mockVerify(o.reference, {}, o.totalKobo);

    expect((await post(body, null)).status).toBe(401);
    expect((await post(body, "deadbeef")).status).toBe(401);
    expect((await post(body, sign(body, "sk_test_wrong"))).status).toBe(401);
    const tampered = body.replace(String(o.totalKobo), "1");
    expect((await post(tampered, sign(body))).status).toBe(401);

    expect(await eventRows(o.reference)).toHaveLength(0);
    expect(await fx.orderStatus(o.orderId)).toBe("pending");
    expect(verifyTransaction).not.toHaveBeenCalled();
  });

  it("confirms the order on a valid charge.success and stores only a whitelist", async () => {
    const o = await newOrder("ok");
    const body = chargeSuccess(o.reference, 700001, o.totalKobo);
    mockVerify(o.reference, {}, o.totalKobo);

    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    expect(await fx.orderStatus(o.orderId)).toBe("paid");
    const [event] = await eventRows(o.reference);
    expect(event.processedAt).not.toBeNull();
    expect(event.eventKey).toBe("charge.success:700001");
    const stored = JSON.stringify(event.payload);
    expect(stored).not.toContain("secret@example.com");
    expect(stored).not.toContain("4081");
    expect(event.payload).toMatchObject({
      event: "charge.success",
      data: { reference: o.reference, amount: o.totalKobo },
    });
  });

  it("treats a replayed event as a duplicate: one row, one verification", async () => {
    const o = await newOrder("dup");
    const body = chargeSuccess(o.reference, 700002, o.totalKobo);
    mockVerify(o.reference, {}, o.totalKobo);

    const first = await post(body, sign(body));
    const second = await post(body, sign(body));
    const third = await post(body, sign(body));

    expect([first.status, second.status, third.status]).toEqual([200, 200, 200]);
    expect(await eventRows(o.reference)).toHaveLength(1);
    expect(verifyTransaction).toHaveBeenCalledTimes(1);
    expect(await fx.orderStatus(o.orderId)).toBe("paid");
  });

  it("does not trust the webhook amount: Paystack verify decides", async () => {
    const o = await newOrder("amount");
    // Payload claims the right amount, but the API says less was paid.
    const body = chargeSuccess(o.reference, 700003, o.totalKobo);
    mockVerify(o.reference, {}, o.totalKobo - 100);

    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    expect(await fx.orderStatus(o.orderId)).toBe("payment_mismatch");
  });

  it("stores and acknowledges events it does not act on", async () => {
    const o = await newOrder("other-event");
    const body = JSON.stringify({
      event: "transfer.success",
      data: { id: 800001, reference: o.reference, status: "success" },
    });

    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    expect(await fx.orderStatus(o.orderId)).toBe("pending");
    expect(verifyTransaction).not.toHaveBeenCalled();
    const [event] = await eventRows(o.reference);
    expect(event.processedAt).not.toBeNull();
  });

  it("returns 500 on a transient failure and processes the retry (not skipped as duplicate)", async () => {
    const o = await newOrder("retry");
    const body = chargeSuccess(o.reference, 700004, o.totalKobo);

    vi.mocked(verifyTransaction).mockRejectedValueOnce(new PaystackError("Could not reach Paystack", true));
    const failed = await post(body, sign(body));
    expect(failed.status).toBe(500);
    const [afterFail] = await eventRows(o.reference);
    expect(afterFail.processedAt).toBeNull();
    expect(afterFail.error).toContain("Could not reach Paystack");
    expect(await fx.orderStatus(o.orderId)).toBe("pending");

    mockVerify(o.reference, {}, o.totalKobo);
    const retried = await post(body, sign(body));
    expect(retried.status).toBe(200);
    expect(await fx.orderStatus(o.orderId)).toBe("paid");
    expect(await eventRows(o.reference)).toHaveLength(1);
  });

  it("acknowledges a charge for an unknown reference without creating anything", async () => {
    const reference = `SUB-unknown-${Date.now()}`;
    references.push(reference);
    const body = chargeSuccess(reference, 700005, 100);

    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    expect(verifyTransaction).not.toHaveBeenCalled(); // not in our DB, so no API call
  });
});
