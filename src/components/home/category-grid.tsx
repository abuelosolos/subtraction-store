import Image from "next/image";

import type { HomeCategory } from "@/lib/catalog";

export function CategoryGrid({ categories }: { categories: HomeCategory[] }) {
  return (
    <section id="categories" aria-label="Shop by category" className="surface-dark section-y">
      <ul className="container-page grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-4 lg:gap-x-4">
        {categories.map(({ label, href, image }) => (
          <li key={label}>
            <a href={href} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-ink/5">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="h-full w-full object-cover transition-transform duration-[var(--duration-standard)] ease-[var(--ease-standard)] group-hover:scale-[1.04] motion-reduce:transition-none"
                />
              </div>
              <span className="mt-3 block text-body font-medium">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
