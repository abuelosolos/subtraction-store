import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { products } from "./catalog-schema";

// All money here is integer kobo (NGN minor units), computed server-side from
// the catalogue. Nothing in these tables comes from client-supplied prices.

export const orderStatus = pgEnum("order_status", [
  "pending", // stock reserved, awaiting payment
  "paid",
  "expired", // reservation lapsed or payment abandoned; stock restocked
  "failed", // could not start payment; stock restocked
  "payment_mismatch", // paid amount/currency differs; needs manual review
  "refunded",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "mismatch",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    email: text().notNull(),
    // Snapshots taken at checkout; never joined back to the user's address book.
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    status: orderStatus().notNull().default("pending"),
    currency: char({ length: 3 }).notNull().default("NGN"),
    subtotalKobo: integer("subtotal_kobo").notNull(),
    shippingKobo: integer("shipping_kobo").notNull(),
    totalKobo: integer("total_kobo").notNull(),
    shippingAddress: jsonb("shipping_address").notNull(),
    /** Reservation deadline; the reconcile job expires pending orders past this. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Claimed (set) before sending; cleared if the send fails. */
    confirmationEmailSentAt: timestamp("confirmation_email_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("orders_amounts_nonneg", sql`${t.subtotalKobo} >= 0 and ${t.shippingKobo} >= 0`),
    check("orders_total_matches", sql`${t.totalKobo} = ${t.subtotalKobo} + ${t.shippingKobo}`),
    index("orders_status_expires_at_idx").on(t.status, t.expiresAt),
    index("orders_user_id_idx").on(t.userId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    // Snapshots: the order must stay readable if the product is later edited.
    name: text().notNull(),
    slug: text().notNull(),
    size: text(),
    unitPriceKobo: integer("unit_price_kobo").notNull(),
    quantity: integer().notNull(),
    lineTotalKobo: integer("line_total_kobo").notNull(),
  },
  (t) => [
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_unit_price_nonneg", sql`${t.unitPriceKobo} >= 0`),
    check("order_items_line_total_matches", sql`${t.lineTotalKobo} = ${t.unitPriceKobo} * ${t.quantity}`),
    index("order_items_order_id_idx").on(t.orderId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    // One Paystack reference per order; a retry re-opens the stored authorization_url.
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: text().notNull().default("paystack"),
    reference: text().notNull().unique(),
    /** Paystack's numeric transaction id (as text), known after verify. */
    providerTransactionId: text("provider_transaction_id").unique(),
    authorizationUrl: text("authorization_url"),
    accessCode: text("access_code"),
    status: paymentStatus().notNull().default("pending"),
    amountKobo: integer("amount_kobo").notNull(),
    currency: char({ length: 3 }).notNull().default("NGN"),
    gatewayResponse: text("gateway_response"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("payments_amount_nonneg", sql`${t.amountKobo} >= 0`)],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    provider: text().notNull().default("paystack"),
    /** `${event}:${data.id ?? data.reference}`. The unique key makes replays no-ops. */
    eventKey: text("event_key").notNull(),
    eventType: text("event_type").notNull(),
    reference: text(),
    payload: jsonb().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text(),
  },
  (t) => [unique("webhook_events_provider_event_key_unique").on(t.provider, t.eventKey)],
);

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type WebhookEventRow = typeof webhookEvents.$inferSelect;
