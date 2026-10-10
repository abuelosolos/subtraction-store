import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

import { SectionHeading } from "./section-heading";

/** Native scroll-snap rail (no JS). Cards peek at the edge to signal scroll. */
export function ProductRail({
  id,
  title,
  products,
  linkLabel = "View all",
  padTop = false,
}: {
  id: string;
  title: string;
  products: Product[];
  linkLabel?: string;
  /** Add top padding when the previous section has none (e.g. after the campaign block). */
  padTop?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`surface-dark pb-[var(--section-y)] ${padTop ? "pt-[var(--section-y)]" : ""}`}
    >
      <div className="container-page">
        <SectionHeading id={id} title={title} linkLabel={linkLabel} />
      </div>
      <ul
        className="container-page flex scroll-pl-[var(--gutter)] snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={`${title}, scroll horizontally`}
        tabIndex={0}
      >
        {products.map((product) => (
          <li
            key={product.slug}
            className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[31%] lg:w-[23.5%]"
          >
            <ProductCard
              product={product}
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 31vw, 68vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
