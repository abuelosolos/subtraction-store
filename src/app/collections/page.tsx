import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { CategoryRails } from "@/components/listing/category-rails";
import { ProductListing } from "@/components/product-listing";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { getAllCategorySlugs, getAllProducts } from "@/lib/catalog-queries";
import { groupByCategory } from "@/lib/product-filters";

export const metadata: Metadata = {
  title: "Our Collection | SUBTRACTION.",
  description: "Every piece from SUBTRACTION in one place. Black only, newest first.",
};

export default function CollectionsPage() {
  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        {/* Short banner: the photo stays a strip so the products start early. */}
        <section aria-labelledby="collection-heading" className="relative h-44 overflow-hidden md:h-56">
          <Image
            src="/images/lookbook/01.webp"
            alt=""
            width={1000}
            height={750}
            sizes="100vw"
            priority
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-surface-dark/60" aria-hidden="true" />
          <div className="container-page relative flex h-full flex-col items-center justify-center text-center">
            <h1 id="collection-heading" className="text-heading-2 font-semibold">Our Collection</h1>
            <p className="mt-3 max-w-prose text-body text-muted">
              Every piece in one place. Black only, no logos, made to be worn on repeat.
            </p>
          </div>
        </section>

        <Suspense fallback={<p role="status" className="container-page py-16 text-body text-muted">Loading</p>}>
          <CollectionSections />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function CollectionSections() {
  const [products, categoryOrder] = await Promise.all([getAllProducts(), getAllCategorySlugs()]);
  return (
    <ProductListing
      id="collection-products-heading"
      title="Shop by category"
      subtitle="Newest first."
      crumbs={[]}
      products={products}
      emptyMessage="Nothing here yet. Check back soon."
      headingAs="h2"
      content={
        products.length > 0 ? (
          <CategoryRails groups={groupByCategory(products, categoryOrder)} gender={null} />
        ) : undefined
      }
    />
  );
}
