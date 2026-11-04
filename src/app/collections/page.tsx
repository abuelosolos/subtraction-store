import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LookbookGrid } from "@/components/listing/lookbook-grid";
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
        <nav aria-label="Breadcrumb" className="container-page py-6 text-caption text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">Collection</li>
          </ol>
        </nav>
        <h1 className="sr-only">Our Collection</h1>
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
  if (products.length === 0) {
    return <p className="container-page py-16 text-body text-muted">Nothing here yet. Check back soon.</p>;
  }
  return <LookbookGrid groups={groupByCategory(products, categoryOrder)} />;
}
