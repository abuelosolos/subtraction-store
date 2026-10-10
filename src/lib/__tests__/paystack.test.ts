import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PaystackError,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
} from "@/lib/paystack";

const KEY = "sk_test_unit_key";
const sign = (body: string, key = KEY) => createHmac("sha512", key).update(body).digest("hex");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.stubEnv("PAYSTACK_SECRET_KEY", KEY);
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "SUB-1", amount: 500000 } });

  it("accepts a valid signature over the raw body", () => {
    expect(verifyWebhookSignature(body, sign(body), KEY)).toBe(true);
  });

  it("is case-insensitive about the hex digest", () => {
    expect(verifyWebhookSignature(body, sign(body).toUpperCase(), KEY)).toBe(true);
  });

  it("rejects a signature made with another key", () => {
    expect(verifyWebhookSignature(body, sign(body, "sk_test_other"), KEY)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const tampered = body.replace("500000", "1");
    expect(verifyWebhookSignature(tampered, sign(body), KEY)).toBe(false);
  });

  it("rejects a re-serialised body (whitespace changes the bytes)", () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyWebhookSignature(pretty, sign(body), KEY)).toBe(false);
  });

  it("rejects missing, empty, wrong-length and non-hex signatures", () => {
    for (const bad of [null, undefined, "", "abc", "z".repeat(128)]) {
      expect(verifyWebhookSignature(body, bad, KEY)).toBe(false);
    }
  });

  it("rejects everything when no secret key is configured", () => {
    expect(verifyWebhookSignature(body, sign(body), "")).toBe(false);
  });
});

describe("initializeTransaction", () => {
  const input = {
    email: "a@example.com",
    amountKobo: 1_234_500,
    reference: "SUB-abc",
    callbackUrl: "https://shop.test/checkout/callback",
    currency: "NGN",
  };

  it("sends integer kobo with the Bearer key and returns the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        status: true,
        message: "ok",
        data: { authorization_url: "https://checkout.paystack.com/x", access_code: "ac", reference: "SUB-abc" },
      }),
    );
    const result = await initializeTransaction(input, fetchMock as unknown as typeof fetch);

    expect(result).toEqual({
      authorizationUrl: "https://checkout.paystack.com/x",
      accessCode: "ac",
      reference: "SUB-abc",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(init.body)).toMatchObject({
      email: "a@example.com",
      amount: 1_234_500,
      currency: "NGN",
      reference: "SUB-abc",
      callback_url: "https://shop.test/checkout/callback",
    });
  });

  it.each([0, -5, 12.5, Number.NaN])("refuses to send amount %s", async (amountKobo) => {
    const fetchMock = vi.fn();
    await expect(
      initializeTransaction({ ...input, amountKobo }, fetchMock as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(PaystackError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a response whose reference differs from ours", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ status: true, data: { authorization_url: "u", access_code: "a", reference: "OTHER" } }),
    );
    await expect(initializeTransaction(input, fetchMock as unknown as typeof fetch)).rejects.toThrow(
      /Unexpected initialize response/,
    );
  });

  it("marks 5xx and network failures transient, 4xx not", async () => {
    const serverError = vi.fn().mockResolvedValue(json({ status: false, message: "down" }, 503));
    const err5 = await initializeTransaction(input, serverError as unknown as typeof fetch).catch((e) => e);
    expect(err5).toBeInstanceOf(PaystackError);
    expect(err5.transient).toBe(true);

    const clientError = vi.fn().mockResolvedValue(json({ status: false, message: "bad" }, 400));
    const err4 = await initializeTransaction(input, clientError as unknown as typeof fetch).catch((e) => e);
    expect(err4.transient).toBe(false);

    const network = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const errN = await initializeTransaction(input, network as unknown as typeof fetch).catch((e) => e);
    expect(errN.transient).toBe(true);
  });
});

describe("verifyTransaction", () => {
  it("maps the verify payload and url-encodes the reference", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        status: true,
        data: {
          status: "success",
          reference: "SUB-a/b",
          amount: 500000,
          currency: "NGN",
          id: 987654,
          gateway_response: "Successful",
        },
      }),
    );
    const result = await verifyTransaction("SUB-a/b", fetchMock as unknown as typeof fetch);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.paystack.co/transaction/verify/SUB-a%2Fb");
    expect(result).toEqual({
      status: "success",
      reference: "SUB-a/b",
      amountKobo: 500000,
      currency: "NGN",
      transactionId: "987654",
      gatewayResponse: "Successful",
    });
  });

  it("rejects a malformed verify payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ status: true, data: { status: "success" } }));
    await expect(verifyTransaction("SUB-1", fetchMock as unknown as typeof fetch)).rejects.toThrow(
      /Unexpected verify response/,
    );
  });
});
