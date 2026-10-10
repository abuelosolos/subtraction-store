import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

export type Crumb = { label: string; href?: string };

/** Breadcrumb, page heading and responsive product grid shared by listing pages. */
export function ProductListing({
  id,
  title,
  subtitle,
  crumbs,
  products,
  emptyMessage,
}: {
  id: string;
  title: string;
  subtitle: string;
  /** Ancestors followed by the current page (last crumb has no href). */
  crumbs: Crumb[];
  products: Product[];
  emptyMessage: string;
}) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="container-page py-6 text-caption text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          {crumbs.map(({ label, href }, i) => (
            <li key={label} className="contents">
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {href ? (
                <Link href={href} className="hover:text-ink">{label}</Link>
              ) : (
                <span aria-current="page" className="text-ink">{label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby={id} className="pb-[var(--section-y)]">
        <div className="container-page">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <h1 id={id} className="text-heading-2 font-semibold">{title}</h1>
              <p className="mt-4 max-w-prose text-body text-muted">{subtitle}</p>
            </div>
            {products.length > 0 ? (
              <p className="text-body text-muted">
                {products.length} {products.length === 1 ? "piece" : "pieces"}
              </p>
            ) : null}
          </header>

          {products.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-4">
              {products.map((product, index) => (
                <li key={product.slug}>
                  <ProductCard
                    product={product}
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    priority={index < 4}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-16 text-body text-muted">{emptyMessage}</p>
          )}
        </div>
      </section>
    </>
  );
}
