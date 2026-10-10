import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/**
 * A signed-in user's saved delivery addresses (PII). Orders never reference
 * these rows: they copy the address into `orders.shipping_address`, so editing
 * or deleting an address cannot change a past order. Deleting the account
 * deletes its addresses (cascade).
 */
export const addresses = pgTable(
  "addresses",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text(),
    recipientName: text("recipient_name").notNull(),
    /** E.164, e.g. +2348031234567. */
    phone: text().notNull(),
    line1: text().notNull(),
    line2: text(),
    city: text().notNull(),
    /** State, province or region; optional because formats vary by country. */
    region: text(),
    postalCode: text("postal_code"),
    /** ISO 3166-1 alpha-2, upper case. */
    country: char({ length: 2 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("addresses_country_upper", sql`${t.country} = upper(${t.country})`),
    index("addresses_user_id_idx").on(t.userId),
    // At most one default address per user.
    uniqueIndex("addresses_one_default_per_user")
      .on(t.userId)
      .where(sql`${t.isDefault}`),
  ],
);

export type AddressRow = typeof addresses.$inferSelect;
