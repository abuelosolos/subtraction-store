import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductRail } from "@/components/home/product-rail";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { formatPrice, stockState } from "@/lib/catalog";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/catalog-queries";

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} | SUBTRACTION.`,
    description: product.description,
  };
}

const stockCopy = {
  // Monochrome states: filled, half, empty.
  "in-stock": { label: "In stock", dot: "bg-ink" },
  "low-stock": { label: "Low stock", dot: "border border-ink bg-gradient-to-r from-ink from-50% to-transparent to-50%" },
  "sold-out": { label: "Sold out", dot: "border border-muted" },
} as const;

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const [product, related] = await Promise.all([
    getProductBySlug(slug),
    getRelatedProducts(slug),
  ]);
  if (!product) notFound();

  const { name, category, priceCents, currency, badge, image, description, stock, sizes } = product;
  const state = stockState(stock);
  const soldOut = state === "sold-out";
  const stockLabel =
    state === "low-stock"
      ? `Low stock, only ${stock} left`
      : stockCopy[state].label;

  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <nav aria-label="Breadcrumb" className="container-page py-6 text-caption text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <a href="#" className="hover:text-ink">{category}</a>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">{name}</li>
          </ol>
        </nav>

        <div className="container-page grid gap-8 pb-[var(--section-y)] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
          {/* Imagery */}
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/5">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
            {badge ? (
              <span className="absolute left-4 top-4 bg-surface-light px-2 py-1 text-caption font-medium uppercase text-ink-on-light">
                {badge}
              </span>
            ) : null}
          </div>

          {/* Info */}
          <div className="lg:sticky lg:top-[calc(var(--navbar-height)+1.5rem)] lg:self-start">
            <p className="text-caption font-medium uppercase text-muted">{category}</p>
            <h1 className="mt-2 text-heading-2 font-semibold">{name}</h1>
            <p className="mt-4 text-heading-3 font-semibold">{formatPrice(priceCents, currency)}</p>

            <p
              className="mt-4 flex items-center gap-2 text-body"
              role="status"
              aria-label={`Availability: ${stockLabel}`}
            >
              <span aria-hidden="true" className={`size-2 rounded-pill ${stockCopy[state].dot}`} />
              {stockLabel}
            </p>

            <p className="mt-6 max-w-[34rem] text-body text-muted">{description}</p>

            <form className="mt-8 flex flex-col gap-6" aria-label="Add to cart">
              {sizes.length > 0 ? (
                <fieldset disabled={soldOut} className="min-w-0">
                  <legend className="mb-3 flex w-full items-center justify-between text-body font-semibold">
                    Select size
                    <a href="#" className="text-caption font-normal text-muted underline underline-offset-4">
                      Size guide
                    </a>
                  </legend>
                  <div className="grid grid-cols-5 gap-2">
                    {sizes.map((size) => (
                      <label key={size} className="block">
                        <input
                          type="radio"
                          name="size"
                          value={size}
                          className="peer sr-only"
                          required
                        />
                        <span className="flex h-12 cursor-pointer items-center justify-center border border-line/40 text-body transition-colors duration-[var(--duration-standard)] hover:border-ink peer-checked:border-ink peer-checked:bg-surface-light peer-checked:text-ink-on-light peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ink)] peer-disabled:cursor-not-allowed peer-disabled:opacity-40">
                          {size}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={soldOut}
                  className="btn btn-inverse btn-lg btn-block"
                >
                  {soldOut ? "Sold out" : "Add to cart"}
                </button>
                <button type="button" className="btn btn-outline btn-lg btn-block">
                  Save to wishlist
                </button>
              </div>
            </form>

            <div className="mt-10 border-t border-line/30">
              {[
                {
                  title: "Details",
                  body: [
                    "Made in Portugal",
                    "Black only, no logos",
                    "Care: see label, dry clean or cold wash",
                    `SKU: SUB-${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
                  ],
                },
                {
                  title: "Shipping & returns",
                  body: [
                    "Free shipping on orders over $150",
                    "Dispatched within 2 business days",
                    "Free returns within 30 days, unworn with tags",
                  ],
                },
              ].map(({ title, body }) => (
                <details key={title} className="group border-b border-line/30 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-body font-semibold [&::-webkit-details-marker]:hidden">
                    {title}
                    <span aria-hidden="true" className="text-heading-3 leading-none group-open:hidden">+</span>
                    <span aria-hidden="true" className="hidden text-heading-3 leading-none group-open:inline">&minus;</span>
                  </summary>
                  <ul className="mt-3 flex flex-col gap-2 text-body text-muted">
                    {body.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>
        </div>

        <ProductRail
          id="related-heading"
          title="You may also like"
          products={related}
          linkLabel="View all"
        />
      </main>
      <SiteFooter />
    </>
  );
}
