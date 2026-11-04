import type { Metadata } from "next";

import { ProductListing } from "@/components/product-listing";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { getBestSellers } from "@/lib/catalog-queries";

export const metadata: Metadata = {
  title: "Best sellers | SUBTRACTION.",
  description: "The pieces our customers come back for. Black only.",
};

export default async function BestSellersPage() {
  const products = await getBestSellers();

  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <ProductListing
          id="best-sellers-heading"
          title="Best sellers"
          subtitle="The pieces people come back for."
          crumbs={[{ label: "Home", href: "/" }, { label: "Best sellers" }]}
          products={products}
          emptyMessage="No best sellers yet. Check back soon."
        />
      </main>
      <SiteFooter />
    </>
  );
}
