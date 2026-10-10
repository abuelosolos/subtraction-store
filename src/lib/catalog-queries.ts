// Storefront reads from Postgres. Each query is cached (Cache Components) and
// tagged "catalog"; call revalidateTag/updateTag("catalog") after catalogue or
// stock writes. Every query returns the shared `Product` shape from ./catalog.
import { cacheLife, cacheTag } from "next/cache";
import { asc, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, products, stock } from "@/db/schema";
import type { HomeCategory, Product } from "@/lib/catalog";

const NEW_ARRIVALS_COUNT = 8;
const ACCESSORIES_COUNT = 4;
const RELATED_COUNT = 6;

const productColumns = {
  slug: products.slug,
  name: products.name,
  category: categories.name,
  priceCents: products.priceCents,
  currency: products.currency,
  badge: products.badge,
  imageSrc: products.imageSrc,
  imageWidth: products.imageWidth,
  imageHeight: products.imageHeight,
  imageAlt: products.imageAlt,
  description: products.description,
  sizes: products.sizes,
  quantity: sql<number>`coalesce(${stock.quantity}, 0)`,
};

const selectProducts = () =>
  db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(stock, eq(stock.productId, products.id));

type ProductQueryRow = Awaited<ReturnType<typeof selectProducts>>[number];

const toProduct = (row: ProductQueryRow): Product => ({
  slug: row.slug,
  name: row.name,
  category: row.category,
  priceCents: row.priceCents,
  currency: row.currency,
  badge: row.badge ?? undefined,
  image: { src: row.imageSrc, width: row.imageWidth, height: row.imageHeight, alt: row.imageAlt },
  stock: Number(row.quantity),
  description: row.description,
  sizes: row.sizes,
});

export async function getNewArrivals(): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await selectProducts().orderBy(desc(products.createdAt)).limit(NEW_ARRIVALS_COUNT);
  return rows.map(toProduct);
}

export async function getBestSellers(): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await selectProducts()
    .where(eq(products.isBestSeller, true))
    .orderBy(desc(products.createdAt));
  return rows.map(toProduct);
}

/**
 * Oldest first, so items already featured under New arrivals (the newest
 * products) do not repeat in this section.
 */
export async function getAccessories(): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await selectProducts()
    .where(eq(categories.slug, "accessories"))
    .orderBy(asc(products.createdAt))
    .limit(ACCESSORIES_COUNT);
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const [row] = await selectProducts().where(eq(products.slug, slug)).limit(1);
  return row ? toProduct(row) : null;
}

/** Same category first, then the rest (newest first), excluding the product itself. */
export async function getRelatedProducts(slug: string): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const sameCategoryFirst = sql`(${products.categoryId} = (select ${products.categoryId} from ${products} where ${products.slug} = ${slug})) desc`;
  const rows = await selectProducts()
    .where(ne(products.slug, slug))
    .orderBy(sameCategoryFirst, desc(products.createdAt))
    .limit(RELATED_COUNT);
  return rows.map(toProduct);
}

export async function getHomeCategories(): Promise<HomeCategory[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.showOnHome, true))
    .orderBy(asc(categories.sortOrder));
  return rows.flatMap((c) =>
    c.imageSrc && c.imageWidth && c.imageHeight
      ? [
          {
            label: c.name,
            // No category routes yet; link to /categories/<slug> once they exist.
            href: "#",
            image: { src: c.imageSrc, width: c.imageWidth, height: c.imageHeight, alt: c.imageAlt ?? c.name },
          },
        ]
      : [],
  );
}

/** For generateStaticParams. */
export async function getAllProductSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((r) => r.slug);
}
