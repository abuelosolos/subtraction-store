import { randomUUID } from "node:crypto";

import { and, count, eq, sql } from "drizzle-orm";

import { addresses, orderItems, orders, payments, products, stock } from "@/db/schema";
import type { DeliveryDetails } from "@/lib/customer";
import { MAX_SAVED_ADDRESSES } from "@/lib/addresses";
import {
  isCheckViolation,
  releaseOrder,
  type Db,
} from "@/lib/order-lifecycle";
import {
  PaystackError,
  initializeTransaction,
  type InitializeInput,
  type InitializedTransaction,
} from "@/lib/paystack";
import {
  priceCart,
  type CartError,
  type CartLineInput,
  type PricedCart,
  type PricedProduct,
} from "@/lib/pricing";

/** How long reserved stock is held while a customer pays. */
export const RESERVATION_MINUTES = 30;

/**
 * Fresh, uncached read of what pricing needs. Never use the `"use cache"`
 * catalogue reads here: price and stock must be the live database values.
 */
export async function loadPricedProducts(
  db: Db,
  slugs: string[],
): Promise<Map<string, PricedProduct>> {
  if (slugs.length === 0) return new Map();
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      currency: products.currency,
      sizes: products.sizes,
      stock: sql<number>`coalesce(${stock.quantity}, 0)::int`,
    })
    .from(products)
    .leftJoin(stock, eq(stock.productId, products.id))
    .where(sql`${products.slug} in ${slugs}`);
  return new Map(rows.map((r) => [r.slug, { ...r, stock: Number(r.stock) }]));
}

/** Advisory price for the checkout summary; submit re-prices again. */
export async function previewCart(
  db: Db,
  lines: readonly CartLineInput[],
  country: string,
): Promise<PricedCart> {
  const slugs = [...new Set(lines.map((l) => l.slug))];
  return priceCart(lines, await loadPricedProducts(db, slugs), country);
}

export type StartCheckoutInput = {
  user: { id: string; email: string };
  lines: readonly CartLineInput[];
  /** Exactly one of these. */
  delivery?: DeliveryDetails;
  savedAddressId?: string;
  saveAddress?: boolean;
  /** Absolute URL Paystack redirects the customer to after payment. */
  callbackUrl: string;
};

export type StartCheckoutDeps = {
  initialize?: (input: InitializeInput) => Promise<InitializedTransaction>;
  now?: () => Date;
  newReference?: () => string;
  /** Called after stock changed so the caller can invalidate caches. */
  onStockChanged?: () => void;
};

export type StartCheckoutResult =
  | { ok: true; orderId: string; reference: string; authorizationUrl: string }
  | { ok: false; reason: "invalid_cart"; errors: CartError[] }
  | { ok: false; reason: "sold_out" }
  | { ok: false; reason: "address_not_found" }
  | { ok: false; reason: "payment_unavailable"; transient: boolean };

export async function startCheckout(
  db: Db,
  input: StartCheckoutInput,
  deps: StartCheckoutDeps = {},
): Promise<StartCheckoutResult> {
  const initialize = deps.initialize ?? initializeTransaction;
  const now = deps.now ?? (() => new Date());
  const newReference = deps.newReference ?? (() => `SUB-${randomUUID()}`);
  const onStockChanged = deps.onStockChanged ?? (() => {});

  // 1. Resolve delivery. A saved address is looked up by id AND owner.
  let delivery = input.delivery;
  if (input.savedAddressId) {
    const [saved] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, input.savedAddressId), eq(addresses.userId, input.user.id)))
      .limit(1);
    if (!saved) return { ok: false, reason: "address_not_found" };
    delivery = {
      fullName: saved.recipientName,
      phone: saved.phone,
      line1: saved.line1,
      line2: saved.line2 ?? undefined,
      city: saved.city,
      region: saved.region ?? undefined,
      postalCode: saved.postalCode ?? undefined,
      country: saved.country,
    };
  }
  if (!delivery) return { ok: false, reason: "address_not_found" };

  // 2. Price from fresh database rows. Nothing price-like comes from the client.
  const priced = await previewCart(db, input.lines, delivery.country);
  if (!priced.ok) return { ok: false, reason: "invalid_cart", errors: priced.errors };

  // 3. Release this user's older pending orders so retries cannot pile up holds.
  const older = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.userId, input.user.id), eq(orders.status, "pending")));
  for (const { id } of older) await releaseOrder(db, id, "expired");

  // 4. Reserve: order + items + payment + stock decrements in ONE batch. The
  //    stock CHECK (quantity >= 0) aborts all of it if anyone else got there first.
  const orderId = randomUUID();
  const reference = newReference();
  const decrements = new Map<number, number>();
  for (const l of priced.lines) {
    decrements.set(l.productId, (decrements.get(l.productId) ?? 0) + l.quantity);
  }

  try {
    await db.batch([
      db.insert(orders).values({
        id: orderId,
        userId: input.user.id,
        email: input.user.email,
        customerName: delivery.fullName,
        customerPhone: delivery.phone,
        currency: priced.currency,
        subtotalKobo: priced.subtotalKobo,
        shippingKobo: priced.shippingKobo,
        totalKobo: priced.totalKobo,
        shippingAddress: {
          recipientName: delivery.fullName,
          phone: delivery.phone,
          line1: delivery.line1,
          line2: delivery.line2 ?? null,
          city: delivery.city,
          region: delivery.region ?? null,
          postalCode: delivery.postalCode ?? null,
          country: delivery.country,
        },
        expiresAt: new Date(now().getTime() + RESERVATION_MINUTES * 60_000),
      }),
      db.insert(orderItems).values(
        priced.lines.map((l) => ({
          orderId,
          productId: l.productId,
          name: l.name,
          slug: l.slug,
          size: l.size,
          unitPriceKobo: l.unitPriceKobo,
          quantity: l.quantity,
          lineTotalKobo: l.lineTotalKobo,
        })),
      ),
      db.insert(payments).values({
        orderId,
        reference,
        amountKobo: priced.totalKobo,
        currency: priced.currency,
      }),
      ...[...decrements].map(([productId, quantity]) =>
        db
          .update(stock)
          .set({ quantity: sql`${stock.quantity} - ${quantity}`, updatedAt: sql`now()` })
          .where(eq(stock.productId, productId)),
      ),
    ]);
  } catch (err) {
    if (isCheckViolation(err)) {
      onStockChanged(); // our cached stock numbers were stale
      return { ok: false, reason: "sold_out" };
    }
    throw err;
  }
  onStockChanged();

  // 5. Start the Paystack transaction for exactly our stored total.
  let started: InitializedTransaction;
  try {
    started = await initialize({
      email: input.user.email,
      amountKobo: priced.totalKobo,
      currency: priced.currency,
      reference,
      callbackUrl: input.callbackUrl,
      metadata: { order_id: orderId },
    });
  } catch (err) {
    await releaseOrder(db, orderId, "failed");
    await db
      .update(payments)
      .set({ status: "failed", updatedAt: sql`now()` })
      .where(eq(payments.reference, reference));
    onStockChanged();
    const transient = err instanceof PaystackError ? err.transient : false;
    return { ok: false, reason: "payment_unavailable", transient };
  }

  await db
    .update(payments)
    .set({
      authorizationUrl: started.authorizationUrl,
      accessCode: started.accessCode,
      updatedAt: sql`now()`,
    })
    .where(eq(payments.reference, reference));

  // 6. Optionally remember the address. Never blocks or fails the payment.
  if (input.saveAddress && !input.savedAddressId) {
    try {
      const [{ n }] = await db
        .select({ n: count() })
        .from(addresses)
        .where(eq(addresses.userId, input.user.id));
      if (n < MAX_SAVED_ADDRESSES) {
        await db.insert(addresses).values({
          userId: input.user.id,
          recipientName: delivery.fullName,
          phone: delivery.phone,
          line1: delivery.line1,
          line2: delivery.line2,
          city: delivery.city,
          region: delivery.region,
          postalCode: delivery.postalCode,
          country: delivery.country,
          isDefault: n === 0,
        });
      }
    } catch {
      // Intentionally ignored: the order is already created.
    }
  }

  return { ok: true, orderId, reference, authorizationUrl: started.authorizationUrl };
}
