import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { formatPrice } from "@/lib/catalog";
import { fulfilmentLabel, orderStatusLabel } from "@/lib/order-labels";
import { countryName } from "@/lib/customer";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order | SUBTRACTION.",
  robots: { index: false },
};

export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <section aria-labelledby="order-heading" className="container-page py-[var(--section-y)]">
          <Suspense fallback={<p role="status" className="text-body text-muted">Loading your order</p>}>
            <OrderContent params={params} />
          </Suspense>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

async function OrderContent({ params }: { params: PageProps<"/orders/[id]">["params"] }) {
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) notFound();

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);

  // Owner-only: another user's order id is indistinguishable from a missing one.
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, parsed.data), eq(orders.userId, user.id)))
    .limit(1);
  if (!order) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const address = order.shippingAddress as Record<string, string | null>;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16">
      <div>
        <Link href="/account" className="mb-4 inline-block text-caption uppercase text-muted hover:text-ink">
          &larr; Back to orders
        </Link>
        <h1 id="order-heading" className="text-heading-2 font-semibold">Order</h1>
        <p className="mt-2 text-body text-muted">
          {order.status === "paid"
            ? (fulfilmentLabel[order.fulfilmentStatus] ?? "Paid")
            : (orderStatusLabel[order.status] ?? order.status)}{" "}
          · placed {order.createdAt.toLocaleDateString("en-GB")}
        </p>
        {order.status === "paid" && order.trackingNumber ? (
          <p className="mt-1 text-body text-muted">
            Tracking: {order.trackingCarrier ? `${order.trackingCarrier} ` : ""}
            {order.trackingNumber}
          </p>
        ) : null}
        <ul className="mt-8 flex flex-col divide-y divide-line/30 border-y border-line/30">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-4 text-body">
              <span>
                <Link href={`/products/${item.slug}`} className="font-semibold">{item.name}</Link>
                <span className="block text-muted">
                  {item.size ? `Size ${item.size} · ` : ""}Qty {item.quantity}
                </span>
              </span>
              <span className="font-medium">{formatPrice(item.lineTotalKobo, order.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-6 flex max-w-sm flex-col gap-3 text-body">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatPrice(order.subtotalKobo, order.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Shipping</dt>
            <dd>{formatPrice(order.shippingKobo, order.currency)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line/30 pt-3 font-semibold">
            <dt>Total</dt>
            <dd>{formatPrice(order.totalKobo, order.currency)}</dd>
          </div>
        </dl>
      </div>

      <aside className="h-fit border border-line/30 p-6">
        <h2 className="text-heading-3 font-semibold">Delivery</h2>
        <address className="mt-4 text-body not-italic text-muted">
          <span className="block font-semibold text-ink">{order.customerName}</span>
          {[address.line1, address.line2, address.city, address.region, address.postalCode]
            .filter(Boolean)
            .map((line) => (
              <span key={line} className="block">{line}</span>
            ))}
          <span className="block">{countryName(address.country ?? "")}</span>
          <span className="mt-2 block">{order.customerPhone}</span>
          <span className="block">{order.email}</span>
        </address>
      </aside>
    </div>
  );
}
