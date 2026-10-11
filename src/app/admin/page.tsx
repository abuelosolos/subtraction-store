import Link from "next/link";

import { AdminGate } from "@/components/admin/admin-gate";
import { DataTable } from "@/components/admin/data-table";
import { AdminPage } from "@/components/admin/page-frame";
import { StatusBadge } from "@/components/admin/status-badge";
import { orderTone } from "@/components/admin/tones";
import { db } from "@/db";
import { getAttentionCounts, listAdminOrders, parseOrderFilters, type AdminOrderRow } from "@/lib/admin/orders";
import { formatPrice } from "@/lib/catalog";
import { orderStatusLabel } from "@/lib/order-labels";

export default function AdminOverviewPage() {
  return (
    <AdminPage title="Overview" id="admin-overview" description="What needs attention, and the latest orders.">
      <AdminGate path="/admin">{async () => <Overview />}</AdminGate>
    </AdminPage>
  );
}

async function Overview() {
  const [c, recent] = await Promise.all([
    getAttentionCounts(db),
    listAdminOrders(db, parseOrderFilters({})),
  ]);
  const cards = [
    { label: "Under review", value: c.mismatch, href: "/admin/orders?status=payment_mismatch", note: "Paid amount didn't match; needs a human.", urgent: c.mismatch > 0 },
    { label: "To ship", value: c.toFulfil, href: "/admin/orders?status=paid&fulfilment=unfulfilled", note: "Paid, ready to pack and send.", urgent: c.toFulfil > 0 },
    { label: "Awaiting payment", value: c.pending, href: "/admin/orders?status=pending", note: "Stock held for up to 30 minutes.", urgent: false },
    { label: "Low or out of stock", value: c.lowStock, href: "/admin/stock", note: "At or below the low-stock threshold.", urgent: c.lowStock > 0 },
  ];
  return (
    <div className="flex flex-col gap-8">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <li key={card.label}>
            <Link href={card.href} className="admin-stat h-full">
              <span className="flex items-center justify-between gap-2 text-body text-muted">
                {card.label}
                {card.urgent ? <StatusBadge tone="warn">Action</StatusBadge> : null}
              </span>
              <span className="mt-3 block text-heading-2 font-semibold tabular-nums">{card.value}</span>
              <span className="mt-2 block text-caption text-muted">{card.note}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="recent-orders">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="recent-orders" className="text-body font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="admin-action">View all</Link>
        </div>
        <DataTable<AdminOrderRow>
          caption="Recent orders"
          rows={recent.rows.slice(0, 5)}
          rowKey={(o) => o.id}
          empty="No orders yet."
          columns={[
            {
              header: "Order",
              cell: (o) => (
                <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                  #{o.id.slice(0, 8).toUpperCase()}
                </Link>
              ),
            },
            { header: "Customer", cell: (o) => o.customerName },
            { header: "Status", cell: (o) => <StatusBadge tone={orderTone(o.status)}>{orderStatusLabel[o.status] ?? o.status}</StatusBadge> },
            { header: "Total", numeric: true, cell: (o) => formatPrice(o.totalKobo, o.currency) },
          ]}
        />
      </section>
    </div>
  );
}
