import Link from "next/link";

import { AdminGate } from "@/components/admin/admin-gate";
import { DataTable } from "@/components/admin/data-table";
import { AdminPage } from "@/components/admin/page-frame";
import { StatusBadge } from "@/components/admin/status-badge";
import { db } from "@/db";
import {
  listAdminOrders,
  parseOrderFilters,
  type AdminOrderFilters,
  type AdminOrderRow,
} from "@/lib/admin/orders";
import { formatPrice } from "@/lib/catalog";
import { fulfilmentLabel, orderStatusLabel } from "@/lib/order-labels";

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <AdminPage title="Orders" id="admin-orders">
      <AdminGate path="/admin/orders">{async () => <Orders searchParams={searchParams} />}</AdminGate>
    </AdminPage>
  );
}

const STATUS_OPTIONS = ["pending", "paid", "expired", "failed", "payment_mismatch", "refunded"] as const;

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  const filters = parseOrderFilters(await searchParams);
  const { rows, total, pageSize } = await listAdminOrders(db, filters);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const href = (over: Partial<AdminOrderFilters>) => {
    const next = { ...filters, ...over };
    const qs = new URLSearchParams();
    if (next.status) qs.set("status", next.status);
    if (next.fulfilment) qs.set("fulfilment", next.fulfilment);
    if (next.q) qs.set("q", next.q);
    if (next.page > 1) qs.set("page", String(next.page));
    const s = qs.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <form method="get" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] sm:items-end">
        <div>
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" className="field" defaultValue={filters.q ?? ""} placeholder="Email, name or order id" maxLength={100} />
        </div>
        <div>
          <label htmlFor="status" className="field-label">Status</label>
          <select id="status" name="status" className="field" defaultValue={filters.status ?? ""}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{orderStatusLabel[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fulfilment" className="field-label">Fulfilment</label>
          <select id="fulfilment" name="fulfilment" className="field" defaultValue={filters.fulfilment ?? ""}>
            <option value="">All</option>
            {Object.entries(fulfilmentLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-inverse btn-lg">Filter</button>
      </form>

      <p role="status" className="text-body text-muted">
        {total} {total === 1 ? "order" : "orders"}
      </p>

      <DataTable<AdminOrderRow>
        caption="Orders"
        rows={rows}
        rowKey={(o) => o.id}
        empty="No orders match these filters."
        columns={[
          {
            header: "Order",
            cell: (o) => (
              <Link href={`/admin/orders/${o.id}`} className="font-semibold underline underline-offset-4">
                #{o.id.slice(0, 8).toUpperCase()}
              </Link>
            ),
          },
          { header: "Placed", cell: (o) => o.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) },
          {
            header: "Customer",
            cell: (o) => (
              <span>
                <span className="block">{o.customerName}</span>
                <span className="block text-muted">{o.email}</span>
              </span>
            ),
          },
          { header: "Items", numeric: true, cell: (o) => o.itemCount },
          {
            header: "Status",
            cell: (o) => (
              <StatusBadge strong={o.status === "payment_mismatch"}>
                {orderStatusLabel[o.status] ?? o.status}
              </StatusBadge>
            ),
          },
          {
            header: "Fulfilment",
            cell: (o) => (o.status === "paid" ? (fulfilmentLabel[o.fulfilmentStatus] ?? o.fulfilmentStatus) : "—"),
          },
          { header: "Total", numeric: true, cell: (o) => formatPrice(o.totalKobo, o.currency) },
        ]}
      />

      {pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between text-body">
          {filters.page > 1 ? (
            <Link href={href({ page: filters.page - 1 })} className="underline underline-offset-4">Previous</Link>
          ) : <span />}
          <span className="text-muted">Page {filters.page} of {pages}</span>
          {filters.page < pages ? (
            <Link href={href({ page: filters.page + 1 })} className="underline underline-offset-4">Next</Link>
          ) : <span />}
        </nav>
      ) : null}
    </div>
  );
}
