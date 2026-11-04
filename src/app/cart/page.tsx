import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
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
        <section aria-labelledby="cart-heading" className="pt-10 pb-[var(--section-y)]">
          <div className="container-page">
            <h1 id="cart-heading" className="mb-8 text-heading-2 font-semibold">Cart</h1>
            <CartView />
          </div>
        </section>
      </main>
    </>
  );
}
