"use server";

import { getSearchIndex } from "@/lib/catalog-queries";
import type { SearchItem } from "@/lib/search";

/**
 * Display-only product index for the navbar search (cached catalogue read,
 * archived products excluded). No prices here are used for payment.
 */
export async function getSearchIndexAction(): Promise<SearchItem[]> {
  return getSearchIndex();
}
