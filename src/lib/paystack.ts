import { createHmac, timingSafeEqual } from "node:crypto";

// Thin Paystack client. Request side confirmed from Paystack's own curl samples
// (POST /transaction/initialize with email + amount, GET /transaction/verify/:reference,
// Bearer secret key). Response fields below (data.authorization_url, access_code,
// status, amount, currency, id, gateway_response) follow Paystack's documented
// response envelope `{ status, message, data }` and must be confirmed against a
// real test-mode call.

const BASE_URL = "https://api.paystack.co";
const TIMEOUT_MS = 15_000;

export class PaystackError extends Error {
  constructor(
    message: string,
    /** True when retrying later could succeed (network, 5xx, 429). */
    readonly transient = false,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

type FetchLike = typeof fetch;

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackError("PAYSTACK_SECRET_KEY is not set");
  return key;
}

async function call<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
  fetchImpl: FetchLike,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(`${BASE_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new PaystackError("Could not reach Paystack", true);
  }

  let payload: { status?: boolean; message?: string; data?: unknown } | null = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON body; handled below.
  }

  if (!response.ok || !payload || payload.status !== true) {
    const transient = response.status >= 500 || response.status === 429;
    throw new PaystackError(payload?.message ?? `Paystack error ${response.status}`, transient);
  }
  return payload.data as T;
}

export type InitializeInput = {
  email: string;
  /** Kobo. Always derived from our own order total. */
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  currency: string;
  metadata?: Record<string, unknown>;
};

export type InitializedTransaction = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

export async function initializeTransaction(
  input: InitializeInput,
  fetchImpl: FetchLike = fetch,
): Promise<InitializedTransaction> {
  if (!Number.isInteger(input.amountKobo) || input.amountKobo <= 0) {
    throw new PaystackError("Amount must be a positive integer in kobo");
  }
  const data = await call<{
    authorization_url?: string;
    access_code?: string;
    reference?: string;
  }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: {
        email: input.email,
        amount: input.amountKobo,
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      },
    },
    fetchImpl,
  );

  if (!data.authorization_url || !data.access_code || data.reference !== input.reference) {
    throw new PaystackError("Unexpected initialize response from Paystack");
  }
  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export type VerifiedTransaction = {
  /** Paystack transaction state, e.g. "success", "failed", "abandoned". */
  status: string;
  reference: string;
  amountKobo: number;
  currency: string;
  transactionId: string;
  gatewayResponse: string | null;
};

export async function verifyTransaction(
  reference: string,
  fetchImpl: FetchLike = fetch,
): Promise<VerifiedTransaction> {
  const data = await call<{
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    id?: number | string;
    gateway_response?: string | null;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" }, fetchImpl);

  if (
    typeof data.status !== "string" ||
    typeof data.reference !== "string" ||
    typeof data.amount !== "number" ||
    typeof data.currency !== "string" ||
    data.id === undefined
  ) {
    throw new PaystackError("Unexpected verify response from Paystack");
  }
  return {
    status: data.status,
    reference: data.reference,
    amountKobo: data.amount,
    currency: data.currency,
    transactionId: String(data.id),
    gatewayResponse: data.gateway_response ?? null,
  };
}

/**
 * `x-paystack-signature` is the hex HMAC-SHA512 of the RAW request body keyed
 * with the secret key. Pass the exact string from `request.text()`; never a
 * re-serialised object.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  key: string | undefined = process.env.PAYSTACK_SECRET_KEY,
): boolean {
  if (!signature || !key) return false;
  const expected = createHmac("sha512", key).update(rawBody, "utf8").digest("hex");
  const given = Buffer.from(signature.trim().toLowerCase(), "utf8");
  const want = Buffer.from(expected, "utf8");
  return given.length === want.length && timingSafeEqual(given, want);
}
