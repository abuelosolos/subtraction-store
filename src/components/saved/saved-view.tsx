"use client";

import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { TrashIcon } from "@/components/ui/icons";
import { useHydrated } from "@/lib/local-store";
import { removeSaved, useSaved } from "@/lib/saved-store";
import { useProducts } from "@/lib/use-products";

export function SavedView() {
  const hydrated = useHydrated();
  const slugs = useSaved();
  const { status, products } = useProducts(slugs);

  if (!hydrated || (slugs.length > 0 && status === "loading")) {
    return (
      <p role="status" className="py-16 text-body text-muted">
        Loading your saved items
      </p>
    );
  }

  if (status === "error") {
    return (
      <p role="alert" className="py-16 text-body">
        We couldn&apos;t load your saved items. Refresh the page to try again.
      </p>
    );
  }

  // Saved slugs that no longer exist in the catalogue are skipped.
  const items = slugs.flatMap((slug) => {
    const product = products.get(slug);
    return product ? [product] : [];
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center text-body text-ink/40">
        <p>You haven&apos;t saved anything yet</p>
        <p>Shop new arrivals</p>
        <Link
          href="/new-arrivals"
          aria-label="Shop new arrivals"
          className="mt-8 flex size-20 items-center justify-center rounded-pill border-hairline text-ink/40 transition-colors duration-[var(--duration-standard)] ease-[var(--ease-standard)] hover:border-ink hover:text-ink focus-visible:text-ink"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-8 text-body text-muted">
        {items.length} {items.length === 1 ? "piece" : "pieces"}
      </p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-4">
        {items.map((product, index) => (
          <li key={product.slug}>
            <ProductCard
              product={product}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              priority={index < 4}
            />
            <button
              type="button"
              onClick={() => removeSaved(product.slug)}
              className="mt-1 inline-flex size-11 items-center justify-center text-muted hover:text-ink"
            >
              <TrashIcon />
              <span className="sr-only">Remove {product.name} from saved items</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
