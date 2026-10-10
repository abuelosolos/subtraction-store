import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { db } from "@/db";
import { getSavedAddresses } from "@/lib/addresses";
import { COUNTRIES, countryName } from "@/lib/customer";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Checkout | SUBTRACTION.",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <nav aria-label="Breadcrumb" className="container-page py-6 text-caption text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/cart" className="hover:text-ink">Cart</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">Checkout</li>
          </ol>
        </nav>
        <section aria-labelledby="checkout-heading" className="pb-[var(--section-y)]">
          <div className="container-page">
            <h1 id="checkout-heading" className="mb-8 text-heading-2 font-semibold">Checkout</h1>
            <Suspense fallback={<p role="status" className="py-16 text-body text-muted">Loading checkout</p>}>
              <CheckoutContent />
            </Suspense>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/** Real session check; the proxy redirect is only optimistic. */
async function CheckoutContent() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/checkout");

  const addresses = await getSavedAddresses(db, user.id);
  const countries = COUNTRIES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <CheckoutForm
      email={user.email}
      defaultName={user.name}
      defaultPhone={user.phone ?? ""}
      addresses={addresses}
      countries={countries}
    />
  );
}
