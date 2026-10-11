import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

export type CategoryGroup = { slug: string; name: string; products: Product[] };

const PER_RAIL = 8;

/**
 * Men's / Women's landing sections: one scroll-snap rail per category (Shoes,
 * Hoodies, T-shirts...), like the homepage rails but grouped by category.
 * Native scrolling, no JS; "View all" opens that category with the same gender.
 */
export function CategoryRails({
  groups,
  gender,
}: {
  groups: CategoryGroup[];
  /** Carried to the category page so its heading reads "Men's Footwear". */
  gender: "men" | "women" | null;
}) {
  return (
    <div className="flex flex-col gap-14">
      {groups.map((group) => {
        const headingId = `rail-${group.slug}`;
        // The catch-all men/women categories share their slug with the gender
        // landing pages, so a gender param opens the filterable grid instead.
        const linkGender = gender ?? (group.slug === "men" || group.slug === "women" ? group.slug : null);
        const href = `/categories/${group.slug}${linkGender ? `?gender=${linkGender}` : ""}`;
        return (
          <section key={group.slug} aria-labelledby={headingId}>
            <div className="mb-6 flex items-end justify-between gap-6">
              <h2 id={headingId} className="text-heading-3 font-semibold">{group.name}</h2>
              <Link href={href} className="shrink-0 text-body font-medium underline underline-offset-4">
                View all<span className="sr-only"> {group.name}</span>
              </Link>
            </div>
            <ul
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label={`${group.name}, scroll horizontally`}
              tabIndex={0}
            >
              {group.products.slice(0, PER_RAIL).map((product) => (
                <li key={product.slug} className="w-[60%] shrink-0 snap-start sm:w-[38%] xl:w-[30%]">
                  <ProductCard product={product} sizes="(min-width: 1280px) 22vw, (min-width: 640px) 30vw, 60vw" />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
