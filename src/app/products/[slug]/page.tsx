import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";

import { DesktopThumbs, GalleryProvider, MobileThumbs, ProductGallery } from "@/components/product-gallery";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductRail } from "@/components/home/product-rail";
import { ProductActions } from "@/components/product-actions";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { formatPrice, stockState } from "@/lib/catalog";
import { productCrumbs } from "@/lib/product-filters";
import { SHIPPING_DOMESTIC_KOBO, SHIPPING_INTERNATIONAL_KOBO } from "@/lib/pricing";
import {
  getAllProductSlugs,
  getCurrentSlugForOldSlug,
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
  // Shown under the link preview (WhatsApp etc.); the image is ./opengraph-image.ts.
  const description = clip(`${formatPrice(product.priceCents, product.currency)} · ${product.description}`, 200);
  return {
    title: `${product.name} | SUBTRACTION.`,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      siteName: "SUBTRACTION.",
      locale: "en_NG",
      url: `/products/${product.slug}`,
      title: product.name,
      description,
    },
    twitter: { card: "summary_large_image", title: product.name, description },
  };
}

function clip(text: string, max: number) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
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
  if (!product) {
    // A renamed product: send old links to its current address.
    const current = await getCurrentSlugForOldSlug(slug);
    if (current) permanentRedirect(`/products/${current}`);
    notFound();
  }

  const crumbs = productCrumbs(product);
  const { name, priceCents, currency, image, description, stock, sizes } = product;
  const state = stockState(stock);
  const soldOut = state === "sold-out";
  const stockLabel =
    state === "low-stock"
      ? `Low stock, only ${stock} left`
      : stockCopy[state].label;

  return (
    <>
      {/* Phones: the photo is a hero under a bar with no fill until the photo has scrolled under it (the #hero marker matches the photo).
          From md the marker is hidden, so the bar is solid as before. */}
      <SiteNavbar clearOnPhone />
      <main className="surface-dark relative max-md:pt-0 md:pt-[var(--navbar-height)]">
        <div id="hero" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/5] md:hidden" />
        <nav aria-label="Breadcrumb" className="container-page hidden py-6 md:block text-caption text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            {crumbs.map((c, i) => (
              <Fragment key={c.label}>
                {i > 0 && <li aria-hidden="true">/</li>}
                {c.href ? (
                  <li>
                    <Link href={c.href} className="hover:text-ink">{c.label}</Link>
                  </li>
                ) : (
                  <li aria-current="page" className="text-ink">{c.label}</li>
                )}
              </Fragment>
            ))}
          </ol>
        </nav>

        <GalleryProvider images={product.gallery?.length ? product.gallery : [image]}>
        <div className="container-page grid gap-8 max-md:gap-6 pb-[var(--section-y)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
          {/* Imagery */}
          <div className="max-md:-mx-[var(--gutter)]">
            <ProductGallery />
          </div>

          {/* Info */}
          {/* From lg the thumbnails sit beside the info card and move (and stop) with it. */}
          <div className="lg:sticky lg:top-[calc(var(--navbar-height)+1.5rem)] lg:flex lg:gap-6 lg:self-start">
            <DesktopThumbs />
            <div className="lg:min-w-0 lg:flex-1">
            <h1 className="text-body font-semibold">{name}</h1>
            <p className="mt-2 text-body">{formatPrice(priceCents, currency)}</p>
            <MobileThumbs />

            {/* Only call out the exceptions; "In stock" is the default and adds noise. */}
            {state !== "in-stock" ? (
              <p
                className="mt-4 flex items-center gap-2 text-body"
                role="status"
                aria-label={`Availability: ${stockLabel}`}
              >
                <span aria-hidden="true" className={`size-2 rounded-pill ${stockCopy[state].dot}`} />
                {stockLabel}
              </p>
            ) : null}

            <p className="mt-6 max-w-[34rem] text-body text-muted">{description}</p>

            <ProductActions slug={slug} name={name} sizes={sizes} soldOut={soldOut} />

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
                    `Shipping within Nigeria ${formatPrice(SHIPPING_DOMESTIC_KOBO, "NGN")}, international ${formatPrice(SHIPPING_INTERNATIONAL_KOBO, "NGN")}`,
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
        </div>
        </GalleryProvider>

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
