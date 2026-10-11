import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminCard } from "@/components/admin/admin-card";
import { AdminGate } from "@/components/admin/admin-gate";
import { Notice } from "@/components/admin/notice";
import { FulfilmentForm, RecheckPayment } from "@/components/admin/order-actions";
import { AdminPage } from "@/components/admin/page-frame";
import { StatusBadge } from "@/components/admin/status-badge";
import { fulfilmentTone, orderTone } from "@/components/admin/tones";
import { db } from "@/db";
import { getAdminOrder } from "@/lib/admin/orders";
import { formatPrice } from "@/lib/catalog";
import { countryName } from "@/lib/customer";
import { fulfilmentLabel, orderStatusLabel } from "@/lib/order-labels";

export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <AdminPage
      title="Order"
      id="admin-order"
      crumbs={[{ label: "Orders", href: "/admin/orders" }, { label: "Order" }]}
    >
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
  const when = (d: Date) => d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-6">
      {/* Summary: which order, its state, and when it was placed. */}
      <div className="admin-card admin-card-body flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-heading-3 font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
          <StatusBadge tone={orderTone(order.status)}>{orderStatusLabel[order.status] ?? order.status}</StatusBadge>
          {order.status === "paid" ? (
            <StatusBadge tone={fulfilmentTone(order.fulfilmentStatus)}>
              {fulfilmentLabel[order.fulfilmentStatus] ?? order.fulfilmentStatus}
            </StatusBadge>
          ) : null}
        </div>
        <p className="text-body text-muted">Placed {when(order.createdAt)}</p>
      </div>

      {order.status === "payment_mismatch" ? (
        <Notice tone="warn" role="note">
          <p className="font-semibold">This order needs a human.</p>
          <p className="mt-1 text-muted">
            Paystack reported a payment that doesn&apos;t match this order, or stock sold out before a late payment landed.
            Check the transaction in the Paystack dashboard and refund there if needed. This page can&apos;t mark it paid.
          </p>
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <AdminCard title="Items" flush>
            <ul className="divide-y divide-[var(--admin-border)]">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 px-5 py-4 text-body">
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.name}</span>
                    <span className="block text-muted">
                      {item.size ? `Size ${item.size} · ` : ""}Qty {item.quantity} × {money(item.unitPriceKobo)}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{money(item.lineTotalKobo)}</span>
                </li>
              ))}
            </ul>
            <dl className="ml-auto flex max-w-xs flex-col gap-2 border-t border-[var(--admin-border)] px-5 py-4 text-body tabular-nums">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(order.subtotalKobo)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{money(order.shippingKobo)}</dd></div>
              <div className="flex justify-between border-t border-[var(--admin-border)] pt-2 font-semibold"><dt>Total</dt><dd>{money(order.totalKobo)}</dd></div>
            </dl>
          </AdminCard>

          <AdminCard title="Fulfilment">
            {order.status === "paid" ? (
              <>
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
              </>
            ) : (
              <p className="text-body text-muted">Fulfilment can be set once the order is paid.</p>
            )}
          </AdminCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <AdminCard title="Customer and delivery">
            <address className="text-body not-italic text-muted">
              <span className="block font-semibold text-ink">{order.customerName}</span>
              {[address.line1, address.line2, address.city, address.region, address.postalCode]
                .filter(Boolean)
                .map((line) => (<span key={line} className="block">{line}</span>))}
              <span className="block">{countryName(address.country ?? "")}</span>
              <span className="mt-3 block">{order.customerPhone}</span>
              <span className="block break-all">{order.email}</span>
            </address>
          </AdminCard>

          <AdminCard title="Payment">
            {payment ? (
              <dl className="admin-dl">
                <dt>Reference</dt><dd className="break-all">{payment.reference}</dd>
                <dt>Status</dt><dd>{payment.status}</dd>
                <dt>Amount</dt><dd className="tabular-nums">{formatPrice(payment.amountKobo, payment.currency)}</dd>
                <dt>Gateway</dt><dd>{payment.gatewayResponse ?? "—"}</dd>
                <dt>Verified</dt><dd>{payment.verifiedAt ? when(payment.verifiedAt) : "Not yet"}</dd>
                <dt>Paid at</dt><dd>{order.paidAt ? when(order.paidAt) : "—"}</dd>
              </dl>
            ) : (
              <p className="text-body text-muted">No payment record.</p>
            )}
            {order.status === "pending" || order.status === "expired" ? (
              <div className="mt-5">
                <RecheckPayment orderId={order.id} />
              </div>
            ) : null}
          </AdminCard>

          <AdminCard title="Activity" flush>
            {events.length > 0 ? (
              <ol className="divide-y divide-[var(--admin-border)]">
                {events.map((e) => (
                  <li key={e.id} className="px-5 py-3 text-body">
                    <p className="font-medium">{e.eventType}</p>
                    <p className="text-caption text-muted">
                      {when(e.receivedAt)} · {e.processedAt ? "processed" : "unprocessed"}
                      {e.error ? ` · ${e.error}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-5 py-4 text-body text-muted">No payment events yet.</p>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
