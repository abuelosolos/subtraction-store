import Image from "next/image";
import Link from "next/link";

import { formatPrice, type Product } from "@/lib/catalog";

export function ProductCard({ product, sizes }: { product: Product; sizes: string }) {
  const { name, category, priceCents, currency, badge, image } = product;
  const price = formatPrice(priceCents, currency);
  return (
    <article className="group relative">
      <Link href={`/products/${product.slug}`} className="block" aria-label={`${name}, ${price}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-ink/5">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes={sizes}
            className="h-full w-full object-cover transition-transform duration-[var(--duration-standard)] ease-[var(--ease-standard)] group-hover:scale-[1.03] motion-reduce:transition-none"
          />
          {badge ? (
            <span className="absolute left-3 top-3 bg-surface-light px-2 py-1 text-caption font-medium uppercase text-ink-on-light">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-body font-semibold">{name}</h3>
            <p className="text-body text-muted">{category}</p>
          </div>
          <p className="text-body font-medium">{price}</p>
        </div>
      </Link>
    </article>
  );
}
