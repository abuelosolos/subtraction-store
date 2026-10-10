import { createHash } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { webhookEvents } from "@/db/schema";
import { invalidateCatalog } from "@/lib/cache";
import { confirmPayment } from "@/lib/order-lifecycle";
import { PaystackError, verifyWebhookSignature } from "@/lib/paystack";

const PROVIDER = "paystack";

/**
 * Paystack webhook. No session. Order of operations matters:
 *  1. read the RAW body, 2. verify the signature over it, 3. only then parse.
 * The payload is never trusted for amounts: `charge.success` re-verifies the
 * transaction through the Paystack API in confirmPayment.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  if (!verifyWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = body as { event?: unknown; data?: Record<string, unknown> };
  const type = typeof event.event === "string" ? event.event : "unknown";
  const data = event.data ?? {};
  const reference = typeof data.reference === "string" ? data.reference : null;
  const idPart =
    data.id !== undefined && data.id !== null
      ? String(data.id)
      : (reference ?? createHash("sha256").update(raw).digest("hex"));
  const eventKey = `${type}:${idPart}`;

  // Store a whitelist only: drops customer and card (authorization) details.
  const payload = {
    event: type,
    data: {
      id: data.id ?? null,
      reference,
      status: data.status ?? null,
      amount: data.amount ?? null,
      currency: data.currency ?? null,
      paid_at: data.paid_at ?? null,
      gateway_response: data.gateway_response ?? null,
    },
  };

  const inserted = await db
    .insert(webhookEvents)
    .values({ provider: PROVIDER, eventKey, eventType: type, reference, payload })
    .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.eventKey] })
    .returning({ id: webhookEvents.id });

  let eventId = inserted[0]?.id;
  if (!eventId) {
    // Seen before. Skip if it was fully processed; retry if a previous attempt failed.
    const [existing] = await db
      .select({ id: webhookEvents.id, processedAt: webhookEvents.processedAt })
      .from(webhookEvents)
      .where(
        sql`${webhookEvents.provider} = ${PROVIDER} and ${webhookEvents.eventKey} = ${eventKey}`,
      )
      .limit(1);
    if (!existing || existing.processedAt) return new Response("OK (duplicate)", { status: 200 });
    eventId = existing.id;
  }

  if (type !== "charge.success" || !reference) {
    await db
      .update(webhookEvents)
      .set({ processedAt: sql`now()`, error: null })
      .where(eq(webhookEvents.id, eventId));
    return new Response("OK", { status: 200 });
  }

  try {
    await confirmPayment(db, reference);
    invalidateCatalog(); // a late payment can change stock
    await db
      .update(webhookEvents)
      .set({ processedAt: sql`now()`, error: null })
      .where(eq(webhookEvents.id, eventId));
    return new Response("OK", { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : "unknown error";
    await db.update(webhookEvents).set({ error: message }).where(eq(webhookEvents.id, eventId));
    // 5xx makes Paystack retry. Both transient Paystack errors and DB errors land here.
    const status = err instanceof PaystackError && !err.transient ? 200 : 500;
    return new Response("Processing failed", { status });
  }
}
