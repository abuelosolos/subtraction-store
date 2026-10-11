import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { FulfilmentForm, RecheckPayment } from "@/components/admin/order-actions";
import { AdminGate } from "@/components/admin/admin-gate";
import { AdminPage } from "@/components/admin/page-frame";
import { StatusBadge } from "@/components/admin/status-badge";
import { db } from "@/db";
import { getAdminOrder } from "@/lib/admin/orders";
import { formatPrice } from "@/lib/catalog";
import { countryName } from "@/lib/customer";
import { fulfilmentLabel, orderStatusLabel } from "@/lib/order-labels";

export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <AdminPage title="Order" id="admin-order">
      <AdminGate path="/admin/orders">{async () => <OrderDetail params={params} />}</AdminGate>
    </AdminPage>
  );
}

async function OrderDetail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const data = await getAdminOrder(db, id.data);
  if (!data) notFound();
  const { order, items, payment, events } = data;
  const address = order.shippingAddress as Record<string, string | null>;
  const money = (kobo: number) => formatPrice(kobo, order.currency);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link href="/admin/orders" className="text-caption uppercase text-muted hover:text-ink">&larr; All orders</Link>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-body">
          <span className="font-semibold">#{order.id.slice(0, 8).toUpperCase()}</span>
          <StatusBadge strong={order.status === "payment_mismatch"}>{orderStatusLabel[order.status] ?? order.status}</StatusBadge>
          <span className="text-muted">Placed {order.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
        </p>
      </div>

      {order.status === "payment_mismatch" ? (
        <div role="note" className="border border-ink p-5 text-body">
          <p className="font-semibold">This order needs a human.</p>
          <p className="mt-1 text-muted">
            Paystack reported a payment that doesn&apos;t match this order, or stock sold out before a late payment landed.
            Check the transaction in the Paystack dashboard and refund there if needed. This page can&apos;t mark it paid.
          </p>
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="text-heading-3 font-semibold">Items</h2>
          <ul className="mt-4 flex flex-col divide-y divide-line/30 border-y border-line/30">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3 text-body">
                <span>
                  <span className="block font-semibold">{item.name}</span>
                  <span className="block text-muted">{item.size ? `Size ${item.size} · ` : ""}Qty {item.quantity} × {money(item.unitPriceKobo)}</span>
                </span>
                <span className="font-medium">{money(item.lineTotalKobo)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 flex max-w-sm flex-col gap-2 text-body">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(order.subtotalKobo)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{money(order.shippingKobo)}</dd></div>
            <div className="flex justify-between border-t border-line/30 pt-2 font-semibold"><dt>Total</dt><dd>{money(order.totalKobo)}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="customer-heading">
          <h2 id="customer-heading" className="text-heading-3 font-semibold">Customer and delivery</h2>
          <address className="mt-4 text-body not-italic text-muted">
            <span className="block font-semibold text-ink">{order.customerName}</span>
            {[address.line1, address.line2, address.city, address.region, address.postalCode]
              .filter(Boolean)
              .map((line) => (<span key={line} className="block">{line}</span>))}
            <span className="block">{countryName(address.country ?? "")}</span>
            <span className="mt-2 block">{order.customerPhone}</span>
            <span className="block">{order.email}</span>
          </address>
        </section>
      </div>

      <section aria-labelledby="payment-heading">
        <h2 id="payment-heading" className="text-heading-3 font-semibold">Payment</h2>
        {payment ? (
          <dl className="mt-4 grid max-w-xl gap-x-6 gap-y-2 text-body sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt className="text-muted">Reference</dt><dd className="break-all">{payment.reference}</dd>
            <dt className="text-muted">Status</dt><dd>{payment.status}</dd>
            <dt className="text-muted">Amount</dt><dd>{formatPrice(payment.amountKobo, payment.currency)}</dd>
            <dt className="text-muted">Gateway response</dt><dd>{payment.gatewayResponse ?? "—"}</dd>
            <dt className="text-muted">Verified</dt><dd>{payment.verifiedAt ? payment.verifiedAt.toLocaleString("en-GB") : "Not yet"}</dd>
            <dt className="text-muted">Paid at</dt><dd>{order.paidAt ? order.paidAt.toLocaleString("en-GB") : "—"}</dd>
          </dl>
        ) : (
          <p className="mt-4 text-body text-muted">No payment record.</p>
        )}
        {events.length > 0 ? (
          <ul className="mt-4 flex max-w-xl flex-col divide-y divide-line/30 border-y border-line/30 text-body">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{e.eventType}</span>
                <span className="text-muted">
                  {e.receivedAt.toLocaleString("en-GB")} · {e.processedAt ? "processed" : "unprocessed"}
                  {e.error ? ` · ${e.error}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {order.status === "pending" || order.status === "expired" ? (
          <div className="mt-6">
            <RecheckPayment orderId={order.id} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="fulfilment-heading" className="max-w-xl">
        <h2 id="fulfilment-heading" className="text-heading-3 font-semibold">Fulfilment</h2>
        {order.status === "paid" ? (
          <div className="mt-4">
            <p className="mb-5 text-body text-muted">
              Currently: {fulfilmentLabel[order.fulfilmentStatus] ?? order.fulfilmentStatus}
              {order.shippedAt ? ` · shipped ${order.shippedAt.toLocaleDateString("en-GB")}` : ""}
              {order.deliveredAt ? ` · delivered ${order.deliveredAt.toLocaleDateString("en-GB")}` : ""}
            </p>
            <FulfilmentForm
              orderId={order.id}
              status={order.fulfilmentStatus}
              trackingCarrier={order.trackingCarrier ?? ""}
              trackingNumber={order.trackingNumber ?? ""}
              notes={order.adminNotes ?? ""}
            />
          </div>
        ) : (
          <p className="mt-4 text-body text-muted">Fulfilment can be set once the order is paid.</p>
        )}
      </section>
    </div>
  );
}
