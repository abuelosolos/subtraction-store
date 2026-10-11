"use server";

import { getCurrentSlugForOldSlug, getProductBySlug } from "@/lib/catalog-queries";
import type { Product } from "@/lib/catalog";

const MAX_SLUGS = 50;

export type ProductsForSlugs = {
  products: Product[];
  /** Old slug -> current slug, for products that were renamed. */
  renames: Record<string, string>;
};

/**
 * Display data for the cart and saved pages (cached catalogue reads). These
 * prices are for showing only: checkout re-prices from fresh DB rows.
 * Unknown slugs are simply omitted; a slug the product used to have is
 * resolved to the product and reported in `renames` so the client can update
 * its saved copy.
 */
export async function getProductsForSlugs(slugs: string[]): Promise<ProductsForSlugs> {
  if (!Array.isArray(slugs)) return { products: [], renames: {} };
  const unique = [
    ...new Set(slugs.filter((s) => typeof s === "string" && s.length > 0 && s.length <= 100)),
  ].slice(0, MAX_SLUGS);

  const renames: Record<string, string> = {};
  const products: Product[] = [];
  await Promise.all(
    unique.map(async (slug) => {
      const direct = await getProductBySlug(slug);
      if (direct) {
        products.push(direct);
        return;
      }
      const current = await getCurrentSlugForOldSlug(slug);
      const renamed = current ? await getProductBySlug(current) : null;
      if (current && renamed) {
        renames[slug] = current;
        products.push(renamed);
      }
    }),
  );
  return { products, renames };
}
