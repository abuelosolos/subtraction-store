"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

import { formatPrice, type Product } from "@/lib/catalog";
import {
  removeFromCart,
  setCartQuantity,
  useCart,
  type CartLine,
} from "@/lib/cart-store";
import { useHydrated } from "@/lib/local-store";
import { MAX_QUANTITY_PER_LINE } from "@/lib/pricing";
import { useProducts } from "@/lib/use-products";

export function CartView() {
  const hydrated = useHydrated();
  const lines = useCart();
  const slugs = useMemo(() => [...new Set(lines.map((l) => l.slug))], [lines]);
  const { status, products } = useProducts(slugs);

  if (!hydrated || (lines.length > 0 && status === "loading")) {
    return (
      <p role="status" className="py-16 text-body text-muted">
        Loading your cart
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center text-body text-ink/40">
        <p>Your cart is empty</p>
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

  if (status === "error") {
    return (
      <p role="alert" className="py-16 text-body">
        We couldn&apos;t load your cart. Refresh the page to try again.
      </p>
    );
  }

  const payable = lines.filter((l) => {
    const p = products.get(l.slug);
    return p && p.stock > 0;
  });
  const currency = products.get(payable[0]?.slug ?? "")?.currency ?? "USD";
  const subtotal = payable.reduce((sum, l) => {
    const p = products.get(l.slug)!;
    return sum + p.priceCents * Math.min(l.quantity, p.stock);
  }, 0);
  const itemCount = payable.reduce(
    (n, l) => n + Math.min(l.quantity, products.get(l.slug)!.stock),
    0,
  );

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-16">
      <ul className="flex flex-col divide-y divide-line/30 border-y border-line/30">
        {lines.map((line) => (
          <CartRow key={`${line.slug}:${line.size ?? ""}`} line={line} product={products.get(line.slug)} />
        ))}
      </ul>

      <aside
        aria-labelledby="summary-heading"
        className="h-fit border border-line/30 p-6 lg:sticky lg:top-[calc(var(--navbar-height)+1.5rem)]"
      >
        <h2 id="summary-heading" className="text-heading-3 font-semibold">Summary</h2>
        <dl className="mt-6 flex flex-col gap-3 text-body">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">
              Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
            </dt>
            <dd className="font-medium">{formatPrice(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Shipping</dt>
            <dd className="text-muted">Calculated at checkout</dd>
          </div>
        </dl>
        <p className="mt-4 text-caption text-subtle">
          Final prices and availability are confirmed when you check out.
        </p>
        {payable.length > 0 ? (
          <Link href="/checkout" className="btn btn-inverse btn-lg btn-block mt-6">
            Checkout
          </Link>
        ) : (
          <button type="button" disabled className="btn btn-inverse btn-lg btn-block mt-6">
            Nothing available to buy
          </button>
        )}
      </aside>
    </div>
  );
}

function CartRow({
  line,
  product,
}: {
  line: CartLine;
  product: Product | undefined;
}) {
  const remove = (
    <button
      type="button"
      onClick={() => removeFromCart(line.slug, line.size)}
      className="text-caption text-muted underline underline-offset-4 hover:text-ink"
    >
      Remove
      <span className="sr-only"> {product?.name ?? line.slug} from cart</span>
    </button>
  );

  if (!product) {
    return (
      <li className="flex items-center justify-between gap-4 py-6">
        <p className="text-body text-muted">This item is no longer available.</p>
        {remove}
      </li>
    );
  }

  const soldOut = product.stock <= 0;
  const maxQuantity = Math.max(1, Math.min(MAX_QUANTITY_PER_LINE, product.stock));
  const quantity = Math.min(line.quantity, maxQuantity);
  const price = formatPrice(product.priceCents, product.currency);

  return (
    <li className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-6">
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-[4/5] bg-ink/5"
        aria-label={product.name}
      >
        <Image
          src={product.image.src}
          alt={product.image.alt}
          fill
          sizes="(min-width: 640px) 8rem, 6rem"
          className="object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-body font-semibold">
              <Link href={`/products/${product.slug}`}>{product.name}</Link>
            </h3>
            <p className="text-body text-muted">{product.category}</p>
            {line.size ? <p className="text-body text-muted">Size {line.size}</p> : null}
          </div>
          <p className="text-body font-medium">{price}</p>
        </div>

        {soldOut ? (
          <div className="flex items-center justify-between gap-4">
            <p role="status" className="text-body font-semibold">Sold out</p>
            {remove}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center border-hairline rounded-field" role="group" aria-label={`Quantity for ${product.name}`}>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center text-body hover:bg-ink/10 disabled:opacity-40"
                  aria-label={`Decrease quantity of ${product.name}`}
                  disabled={quantity <= 1}
                  onClick={() => setCartQuantity(line.slug, line.size, quantity - 1)}
                >
                  &minus;
                </button>
                <output className="min-w-8 text-center text-body" aria-live="polite">
                  {quantity}
                </output>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center text-body hover:bg-ink/10 disabled:opacity-40"
                  aria-label={`Increase quantity of ${product.name}`}
                  disabled={quantity >= maxQuantity}
                  onClick={() => setCartQuantity(line.slug, line.size, quantity + 1)}
                >
                  +
                </button>
              </div>
              {line.quantity > quantity ? (
                <p role="status" className="text-caption text-muted">
                  Only {product.stock} left
                </p>
              ) : null}
            </div>
            {remove}
          </div>
        )}
      </div>
    </li>
  );
}
