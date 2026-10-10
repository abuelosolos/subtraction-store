import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { db } from "@/db";
import { AutoRefresh } from "@/components/checkout/auto-refresh";
import { ClearCart } from "@/components/checkout/clear-cart";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { confirmPayment, type ConfirmResult } from "@/lib/order-lifecycle";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Payment | SUBTRACTION.",
  robots: { index: false },
};

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function CallbackPage({ searchParams }: PageProps<"/checkout/callback">) {
  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <section aria-labelledby="payment-heading" className="container-page py-[var(--section-y)]">
          <Suspense fallback={<p role="status" className="text-body text-muted">Confirming your payment</p>}>
            <CallbackContent searchParams={searchParams} />
          </Suspense>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * The query string is only a lookup hint. Status comes from our database after
 * confirmPayment() has verified the transaction with Paystack server-side.
 */
async function CallbackContent({
  searchParams,
}: {
  searchParams: PageProps<"/checkout/callback">["searchParams"];
}) {
  const params = await searchParams;
  const reference = first(params.reference) ?? first(params.trxref);

  const user = await getSessionUser();
  if (!user) {
    const back = reference
      ? `/checkout/callback?reference=${encodeURIComponent(reference)}`
      : "/cart";
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  if (!reference || reference.length > 100) {
    return (
      <Message title="We couldn't find that payment">
        <Link href="/cart" className="btn btn-inverse btn-lg mt-6">Back to cart</Link>
      </Message>
    );
  }

  let result: ConfirmResult | null = null;
  try {
    result = await confirmPayment(db, reference, { userId: user.id });
  } catch {
    result = null; // Paystack or the database is unreachable right now
  }

  if (result?.status === "paid") {
    return (
      <Message title="Payment received">
        <ClearCart />
        <p className="mt-4 text-body text-muted">
          Thank you. Your order is confirmed and we&apos;re getting it ready.
        </p>
        <Link href={`/orders/${result.orderId}`} className="btn btn-inverse btn-lg mt-6">
          View your order
        </Link>
      </Message>
    );
  }

  if (result === null || result.status === "pending") {
    return (
      <Message title="Confirming your payment">
        <AutoRefresh />
        <p role="status" className="mt-4 text-body text-muted">
          This usually takes a few seconds. Please don&apos;t pay again. This page will update on its own.
        </p>
        <Link
          href={`/checkout/callback?reference=${encodeURIComponent(reference)}`}
          className="btn btn-outline btn-lg mt-6"
        >
          Check again
        </Link>
      </Message>
    );
  }

  if (result.status === "failed") {
    return (
      <Message title="Payment didn't go through">
        <p className="mt-4 text-body text-muted">
          You haven&apos;t been charged. Your cart is still saved, so you can try again.
        </p>
        <Link href="/checkout" className="btn btn-inverse btn-lg mt-6">Try again</Link>
      </Message>
    );
  }

  if (result.status === "mismatch") {
    return (
      <Message title="We need to review your payment">
        <p className="mt-4 max-w-prose text-body text-muted">
          We received a payment but couldn&apos;t match it to your order automatically. Nothing more is
          needed from you. Contact us and quote this reference: <span className="font-semibold text-ink">{reference}</span>
        </p>
      </Message>
    );
  }

  return (
    <Message title="We couldn't find that payment">
      <Link href="/cart" className="btn btn-inverse btn-lg mt-6">Back to cart</Link>
    </Message>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 id="payment-heading" className="text-heading-2 font-semibold">{title}</h1>
      {children}
    </div>
  );
}
