import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { user } from "./auth-schema";
import { products } from "./catalog-schema";

/** Append-only record of every admin mutation. */
export const adminAudit = pgTable(
  "admin_audit",
  {
    id: uuid().primaryKey().defaultRandom(),
    // No FK cascade: history must outlive a deleted account.
    actorUserId: text("actor_user_id").notNull(),
    action: text().notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    detail: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("admin_audit_target_idx").on(t.targetType, t.targetId),
    index("admin_audit_created_at_idx").on(t.createdAt.desc()),
  ],
);

/** One row per admin stock change, written in the same statement as the change. */
export const stockAdjustments = pgTable(
  "stock_adjustments",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    delta: integer().notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    reason: text().notNull(),
    note: text(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("stock_adjustments_after_nonneg", sql`${t.quantityAfter} >= 0`),
    index("stock_adjustments_product_idx").on(t.productId, t.createdAt.desc()),
  ],
);
