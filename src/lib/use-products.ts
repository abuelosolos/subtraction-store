"use client";

import { useEffect, useState } from "react";

import { getProductsForSlugs } from "@/app/cart/actions";
import { renameCartSlugs } from "@/lib/cart-store";
import type { Product } from "@/lib/catalog";
import { renameSavedSlugs } from "@/lib/saved-store";

type Loaded = { key: string; products: Map<string, Product>; failed: boolean };

const EMPTY = new Map<string, Product>();

/**
 * Loads display data for a set of slugs from the server. Keeps the previous
 * result while a changed slug set is loading so removing a line doesn't flash.
 */
export function useProducts(slugs: string[]) {
  const key = slugs.join("\n");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    getProductsForSlugs(key.split("\n"))
      .then(({ products: list, renames }) => {
        if (cancelled) return;
        // Renamed products are findable by their old slug until the stores catch up.
        const map = new Map(list.map((p) => [p.slug, p]));
        for (const [oldSlug, newSlug] of Object.entries(renames)) {
          const product = map.get(newSlug);
          if (product) map.set(oldSlug, product);
        }
        setLoaded({ key, products: map, failed: false });
        if (Object.keys(renames).length > 0) {
          renameCartSlugs(renames);
          renameSavedSlugs(renames);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, products: EMPTY, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key) return { status: "ready" as const, products: EMPTY };
  if (loaded?.key === key) {
    return loaded.failed
      ? { status: "error" as const, products: EMPTY }
      : { status: "ready" as const, products: loaded.products };
  }
  const stale = loaded?.products ?? EMPTY;
  const covered = slugs.every((s) => stale.has(s));
  return { status: covered ? ("ready" as const) : ("loading" as const), products: stale };
}
