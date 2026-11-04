import Link from "next/link";

import { ProductCardMedia } from "@/components/product-card-media";
import { cardImages, formatPrice, type Product } from "@/lib/catalog";

export function ProductCard({ product, sizes, priority = false }: { product: Product; sizes: string; priority?: boolean }) {
  const { name, priceCents, currency } = product;
  const price = formatPrice(priceCents, currency);
  const href = `/products/${product.slug}`;
  return (
    <article className="group relative">
      <ProductCardMedia
        images={cardImages(product)}
        sizes={sizes}
        priority={priority}
        href={href}
        label={`${name}, ${price}`}
      />
      <Link href={href} tabIndex={-1} aria-hidden="true" className="flex flex-col gap-4 px-3 pb-16 pt-5">
        <h3 className="text-body font-normal">{name}</h3>
        <p className="text-body">{price}</p>
      </Link>
    </article>
  );
}
