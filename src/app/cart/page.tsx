import type { Metadata } from "next";
import Link from "next/link";

import { CartView } from "@/components/cart/cart-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

export const metadata: Metadata = {
  title: "Cart | SUBTRACTION.",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <nav aria-label="Breadcrumb" className="container-page py-6 text-caption text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">Cart</li>
          </ol>
        </nav>
        <section aria-labelledby="cart-heading" className="pb-[var(--section-y)]">
          <div className="container-page">
            <h1 id="cart-heading" className="mb-8 text-heading-2 font-semibold">Cart</h1>
            <CartView />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
