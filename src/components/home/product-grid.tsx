import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

import { SectionHeading } from "./section-heading";

/** Static 2/4-column grid, for shorter lists that shouldn't scroll. */
export function ProductGrid({
  id,
  title,
  products,
  linkLabel = "Shop all",
}: {
  id: string;
  title: string;
  products: Product[];
  linkLabel?: string;
}) {
  return (
    <section aria-labelledby={id} className="surface-dark pb-[var(--section-y)]">
      <div className="container-page">
        <SectionHeading id={id} title={title} linkLabel={linkLabel} />
        <ul className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-4">
          {products.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} sizes="(min-width: 1024px) 25vw, 50vw" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
