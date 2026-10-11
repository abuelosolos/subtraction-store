import { relations, sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Who a product is for. `unisex` shows under both Men's and Women's. */
export const productGender = pgEnum("product_gender", ["men", "women", "unisex"]);

export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  imageSrc: text("image_src"),
  imageWidth: integer("image_width"),
  imageHeight: integer("image_height"),
  imageAlt: text("image_alt"),
  sortOrder: integer("sort_order").notNull().default(0),
  showOnHome: boolean("show_on_home").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text().notNull().default(""),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    /** Minor units (cents). */
    priceCents: integer("price_cents").notNull(),
    currency: char({ length: 3 }).notNull().default("USD"),
    badge: text(),
    imageSrc: text("image_src").notNull(),
    imageWidth: integer("image_width").notNull(),
    imageHeight: integer("image_height").notNull(),
    imageAlt: text("image_alt").notNull(),
    /** Display-only size labels; empty means one size. Not variants. */
    sizes: text().array().notNull().default(sql`'{}'::text[]`),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    gender: productGender().notNull().default("unisex"),
    color: text().notNull().default("Black"),
    /** Free-text collection label (e.g. "Core", "Winter 26"); null when none. */
    collection: text(),
    /** Soft delete: hidden from the shop and checkout, kept for order history. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("products_price_cents_nonneg", sql`${t.priceCents} >= 0`),
    index("products_category_id_idx").on(t.categoryId),
    index("products_created_at_idx").on(t.createdAt.desc()),
  ],
);

export const stock = pgTable(
  "stock",
  {
    productId: integer("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer().notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("stock_quantity_nonneg", sql`${t.quantity} >= 0`)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stock: one(stock, {
    fields: [products.id],
    references: [stock.productId],
  }),
}));

export const stockRelations = relations(stock, ({ one }) => ({
  product: one(products, {
    fields: [stock.productId],
    references: [products.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type StockRow = typeof stock.$inferSelect;
