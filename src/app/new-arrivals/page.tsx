import type { Metadata } from "next";

import { ProductListing } from "@/components/product-listing";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { getNewArrivalsPage } from "@/lib/catalog-queries";

export const metadata: Metadata = {
  title: "New arrivals | SUBTRACTION.",
  description: "The latest pieces from SUBTRACTION. Black only, newest first.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivalsPage();

  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <ProductListing
          id="new-arrivals-heading"
          title="New arrivals"
          subtitle="The latest pieces, newest first."
          crumbs={[{ label: "Home", href: "/" }, { label: "New arrivals" }]}
          products={products}
          emptyMessage="Nothing new right now. Check back soon."
        />
      </main>
      <SiteFooter />
    </>
  );
}
