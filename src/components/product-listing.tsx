import Link from "next/link";
import type { ReactNode } from "react";

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
  empty,
  content,
  sidebar,
  toolbar,
  headingAs: Heading = "h1",
  layout = "page",
  tabs,
}: {
  id: string;
  title: string;
  subtitle: string;
  /** Ancestors followed by the current page (last crumb has no href). */
  crumbs: Crumb[];
  products: Product[];
  emptyMessage: string;
  /** Replaces the empty-state message (e.g. with a "clear filters" action). */
  empty?: ReactNode;
  /** Replaces the product grid (e.g. category sections on the gender views). */
  content?: ReactNode;
  /** Left column from md up (filters). */
  sidebar?: ReactNode;
  /** Shown beside the piece count (e.g. the mobile Filter button). */
  toolbar?: ReactNode;
  /** Pages that already have an h1 (e.g. a banner) render this heading as h2. */
  headingAs?: "h1" | "h2";
  /**
   * "catalog": category pages under a hero. No visible heading or sidebar; a tab
   * row, then "N items" with the toolbar on the right, then a full-bleed seamless grid.
   */
  layout?: "page" | "catalog";
  /** Category tab row (catalog layout). */
  tabs?: ReactNode;
}) {
  if (layout === "catalog") {
    return (
      <>
        {crumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="container-page pt-6 text-caption text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              {crumbs.map(({ label, href }, i) => (
                <li key={label} className="contents">
                  {i > 0 ? <span aria-hidden="true">/</span> : null}
                  {href ? (
                    <Link href={href} className="underline underline-offset-2 hover:text-ink">{label}</Link>
                  ) : (
                    <span aria-current="page" className="text-ink">{label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <section aria-labelledby={id} className="mt-6 pb-[var(--section-y)]">
          <h2 id={id} className="sr-only">{title}</h2>
          {/* Tabs and the count/filter row stick under the navbar while the grid scrolls. */}
          <div className="sticky top-[var(--navbar-height)] z-30 bg-surface">
            {tabs ? (
              <div className="border-b border-line/30">
                <div className="container-page">{tabs}</div>
              </div>
            ) : null}
            <div className={tabs ? undefined : "border-y border-line/30"}>
              <div className="container-page flex items-center justify-between gap-4 py-4 text-body">
                <p>
                  {products.length} {products.length === 1 ? "item" : "items"}
                </p>
                {toolbar}
              </div>
            </div>
          </div>
          {content ? (
            content
          ) : products.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-0.5 md:grid-cols-3 lg:grid-cols-4">
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
            <div className="container-page">{empty ?? <p className="py-16 text-body text-muted">{emptyMessage}</p>}</div>
          )}
        </section>
      </>
    );
  }

  return (
    <>
      {crumbs.length > 0 ? (
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
      ) : null}

      <section aria-labelledby={id} className={crumbs.length > 0 ? "pb-[var(--section-y)]" : "pt-10 pb-[var(--section-y)]"}>
        <div className="container-page">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <Heading id={id} className="text-heading-2 font-semibold">{title}</Heading>
              <p className="mt-4 max-w-prose text-body text-muted">{subtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              {products.length > 0 ? (
                <p className="text-body text-muted">
                  {products.length} {products.length === 1 ? "piece" : "pieces"}
                </p>
              ) : null}
              {toolbar}
            </div>
          </header>

          <div className={sidebar ? "md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12" : undefined}>
            {sidebar ? <aside aria-label="Filters" className="hidden md:block">{sidebar}</aside> : null}
            <div>
              {content ? (
                content
              ) : products.length > 0 ? (
                <ul
                  className={
                    sidebar
                      ? "grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-3 lg:gap-x-4 xl:grid-cols-4"
                      : "grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-4"
                  }
                >
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
                (empty ?? <p className="py-16 text-body text-muted">{emptyMessage}</p>)
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
