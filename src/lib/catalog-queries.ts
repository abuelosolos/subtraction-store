// Storefront reads from Postgres. Each query is cached (Cache Components) and
// tagged "catalog"; call revalidateTag/updateTag("catalog") after catalogue or
// stock writes. Every query returns the shared `Product` shape from ./catalog.
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, isNull, ne, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { categories, productSlugHistory, products, stock } from "@/db/schema";
import type { HomeCategory, Product } from "@/lib/catalog";
import type { SearchItem } from "@/lib/search";

const NEW_ARRIVALS_COUNT = 8;
const NEW_ARRIVALS_PAGE_COUNT = 24;
const ACCESSORIES_COUNT = 4;
const RELATED_COUNT = 6;

const productColumns = {
  slug: products.slug,
  name: products.name,
  category: categories.name,
  categorySlug: categories.slug,
  priceCents: products.priceCents,
  currency: products.currency,
  badge: products.badge,
  imageSrc: products.imageSrc,
  imageWidth: products.imageWidth,
  imageHeight: products.imageHeight,
  imageAlt: products.imageAlt,
  description: products.description,
  sizes: products.sizes,
  gender: products.gender,
  color: products.color,
  collection: products.collection,
  quantity: sql<number>`coalesce(${stock.quantity}, 0)`,
};

/** Archived products never reach the storefront; `extra` narrows further. */
const selectProducts = (extra?: SQL) =>
  db
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(stock, eq(stock.productId, products.id))
    .where(extra ? and(isNull(products.archivedAt), extra) : isNull(products.archivedAt));

type ProductQueryRow = Awaited<ReturnType<typeof selectProducts>>[number];

const toProduct = (row: ProductQueryRow): Product => ({
  slug: row.slug,
  name: row.name,
  category: row.category,
  categorySlug: row.categorySlug,
  priceCents: row.priceCents,
  currency: row.currency,
  badge: row.badge ?? undefined,
  image: { src: row.imageSrc, width: row.imageWidth, height: row.imageHeight, alt: row.imageAlt },
  stock: Number(row.quantity),
  description: row.description,
  sizes: row.sizes,
  gender: row.gender,
  color: row.color,
  collection: row.collection ?? undefined,
});

export async function getNewArrivals(): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await selectProducts().orderBy(desc(products.createdAt)).limit(NEW_ARRIVALS_COUNT);
  return rows.map(toProduct);
}

/** Full New arrivals page: same ordering as the homepage rail, with a longer cut-off. */
export async function getNewArrivalsPage(): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await selectProducts()
    .orderBy(desc(products.createdAt))
    .limit(NEW_ARRIVALS_PAGE_COUNT);
  return rows.map(toProduct);
}

export async function getBestSellers(): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await selectProducts(eq(products.isBestSeller, true))
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
  const rows = await selectProducts(eq(categories.slug, "accessories"))
    .orderBy(asc(products.createdAt))
    .limit(ACCESSORIES_COUNT);
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const [row] = await selectProducts(eq(products.slug, slug)).limit(1);
  return row ? toProduct(row) : null;
}

/** For a slug the product used to have: the slug it answers to now (redirect target), or null. */
export async function getCurrentSlugForOldSlug(oldSlug: string): Promise<string | null> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const [row] = await db
    .select({ slug: products.slug })
    .from(productSlugHistory)
    .innerJoin(products, eq(products.id, productSlugHistory.productId))
    .where(and(eq(productSlugHistory.oldSlug, oldSlug), isNull(products.archivedAt)))
    .limit(1);
  return row?.slug ?? null;
}

/** Same category first, then the rest (newest first), excluding the product itself. */
export async function getRelatedProducts(slug: string): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const sameCategoryFirst = sql`(${products.categoryId} = (select ${products.categoryId} from ${products} where ${products.slug} = ${slug})) desc`;
  const rows = await selectProducts(ne(products.slug, slug))
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
            href: `/categories/${c.slug}`,
            image: { src: c.imageSrc, width: c.imageWidth, height: c.imageHeight, alt: c.imageAlt ?? c.name },
          },
        ]
      : [],
  );
}

export async function getCategoryBySlug(slug: string): Promise<{ slug: string; name: string } | null> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const [row] = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row ?? null;
}

/** Every live product, newest first. Scope for the Men's / Women's gender views. */
export async function getAllProducts(): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await selectProducts().orderBy(desc(products.createdAt)).limit(SEARCH_INDEX_MAX);
  return rows.map(toProduct);
}

/** Newest first. */
export async function getProductsByCategory(slug: string): Promise<Product[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await selectProducts(eq(categories.slug, slug))
    .orderBy(desc(products.createdAt));
  return rows.map(toProduct);
}

export async function getAllCategorySlugs(): Promise<string[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  // Ordered by sort_order: also the section order on the Men's / Women's views.
  const rows = await db
    .select({ slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows.map((r) => r.slug);
}

const SEARCH_INDEX_MAX = 500;

/** Lightweight list for navbar search. Archived products are excluded. */
export async function getSearchIndex(): Promise<SearchItem[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await selectProducts().orderBy(desc(products.createdAt)).limit(SEARCH_INDEX_MAX);
  return rows.map((row) => {
    const p = toProduct(row);
    return {
      slug: p.slug,
      name: p.name,
      category: p.category,
      priceCents: p.priceCents,
      currency: p.currency,
      stock: p.stock,
      image: p.image,
    };
  });
}

/** For generateStaticParams. */
export async function getAllProductSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");
  const rows = await db
    .select({ slug: products.slug })
    .from(products)
    .where(isNull(products.archivedAt));
  return rows.map((r) => r.slug);
}
