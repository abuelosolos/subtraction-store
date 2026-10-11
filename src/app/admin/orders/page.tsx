import Link from "next/link";

import { AdminGate } from "@/components/admin/admin-gate";
import { DataTable } from "@/components/admin/data-table";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { AdminPage } from "@/components/admin/page-frame";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { fulfilmentTone, orderTone } from "@/components/admin/tones";
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

const QUICK_TABS: { label: string; status?: AdminOrderFilters["status"] }[] = [
  { label: "All" },
  { label: "Awaiting payment", status: "pending" },
  { label: "Paid", status: "paid" },
  { label: "Under review", status: "payment_mismatch" },
];

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

  const filtered = Boolean(filters.status || filters.fulfilment || filters.q);

  return (
    <div className="flex flex-col gap-6">
      <FilterTabs
        label="Order status"
        tabs={QUICK_TABS.map((t) => ({
          label: t.label,
          href: href({ status: t.status, page: 1 }),
          active: filters.status === t.status,
        }))}
      />

      <form method="get" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_11rem_auto] sm:items-end">
        <div>
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" type="search" className="field" defaultValue={filters.q ?? ""} placeholder="Email, name or order id" maxLength={100} />
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
        <div className="flex gap-2">
          <button type="submit" className="btn btn-inverse btn-lg">Filter</button>
          {filtered ? <Link href="/admin/orders" className="btn btn-outline btn-lg">Reset</Link> : null}
        </div>
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
              <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                #{o.id.slice(0, 8).toUpperCase()}
              </Link>
            ),
          },
          { header: "Placed", cell: (o) => o.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) },
          {
            header: "Customer",
            cell: (o) => (
              <span className="min-w-0">
                <span className="block">{o.customerName}</span>
                <span className="block break-all text-caption text-muted">{o.email}</span>
              </span>
            ),
          },
          { header: "Items", numeric: true, cell: (o) => o.itemCount },
          {
            header: "Status",
            cell: (o) => (
              <StatusBadge tone={orderTone(o.status)}>{orderStatusLabel[o.status] ?? o.status}</StatusBadge>
            ),
          },
          {
            header: "Fulfilment",
            cell: (o) =>
              o.status === "paid" ? (
                <StatusBadge tone={fulfilmentTone(o.fulfilmentStatus)}>
                  {fulfilmentLabel[o.fulfilmentStatus] ?? o.fulfilmentStatus}
                </StatusBadge>
              ) : (
                <span className="text-muted">—</span>
              ),
          },
          { header: "Total", numeric: true, cell: (o) => formatPrice(o.totalKobo, o.currency) },
        ]}
      />

      <Pagination page={filters.page} pages={pages} total={total} pageSize={pageSize} hrefFor={(p) => href({ page: p })} />
    </div>
  );
}
