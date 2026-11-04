import Image from "next/image";

import type { HomeCategory } from "@/lib/catalog";

/**
 * The four product-type tiles (front shots, no gender in the labels) under the Him / Her panels. Fixed on purpose
 * (not the DB "show on home" categories). Links use the drawer's slugs
 * (src/lib/nav-items.ts); each needs a matching category in admin.
 */
const categories: HomeCategory[] = [
  {
    label: "Shirts",
    href: "/categories/shirts",
    image: { src: "/images/products/midnight-script-shirt-w/front.webp", width: 848, height: 1264, alt: "Model in a black script-print shirt" },
  },
  {
    label: "Jackets",
    href: "/categories/jackets",
    image: { src: "/images/products/heavy-puffer-jacket-m/front.webp", width: 928, height: 1152, alt: "Model in a black puffer jacket" },
  },
  {
    label: "Puffers",
    href: "/categories/jackets",
    image: { src: "/images/products/cropped-puffer-jacket-w/front.webp", width: 848, height: 1264, alt: "Model in a cropped black puffer jacket" },
  },
  {
    label: "Caps",
    href: "/categories/caps",
    image: { src: "/images/products/star-cap-w/front.webp", width: 848, height: 1264, alt: "Model in a black cap with a star emblem" },
  },
];

export function CategoryGrid() {
  return (
    <section id="categories" aria-label="Shop by category" className="surface-dark mt-7 pb-7 md:mt-8 md:pb-8">
      <ul className="grid w-full grid-cols-2 lg:grid-cols-4">
        {categories.map(({ label, href, image }) => (
          <li key={label}>
            <a href={href} className="block">
              <div className="relative aspect-[2/3] overflow-hidden bg-ink/5">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="block px-[var(--gutter)] pb-6 pt-3 text-body font-medium">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
