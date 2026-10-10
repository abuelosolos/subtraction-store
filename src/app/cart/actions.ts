"use server";

import { getProductBySlug } from "@/lib/catalog-queries";
import type { Product } from "@/lib/catalog";

const MAX_SLUGS = 50;

/**
 * Display data for the cart and saved pages (cached catalogue reads). These
 * prices are for showing only: checkout re-prices from fresh DB rows.
 * Unknown slugs are simply omitted.
 */
export async function getProductsForSlugs(slugs: string[]): Promise<Product[]> {
  if (!Array.isArray(slugs)) return [];
  const unique = [
    ...new Set(slugs.filter((s) => typeof s === "string" && s.length > 0 && s.length <= 100)),
  ].slice(0, MAX_SLUGS);
  const found = await Promise.all(unique.map((slug) => getProductBySlug(slug)));
  return found.filter((p): p is Product => p !== null);
}
