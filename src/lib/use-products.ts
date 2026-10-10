"use client";

import { useEffect, useState } from "react";

import { getProductsForSlugs } from "@/app/cart/actions";
import type { Product } from "@/lib/catalog";

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
      .then((list) => {
        if (!cancelled) {
          setLoaded({ key, products: new Map(list.map((p) => [p.slug, p])), failed: false });
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
