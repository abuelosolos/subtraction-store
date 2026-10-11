import Link from "next/link";

import { AdminGate } from "@/components/admin/admin-gate";
import { DataTable } from "@/components/admin/data-table";
import { AdminPage } from "@/components/admin/page-frame";
import { StatusBadge } from "@/components/admin/status-badge";
import { db } from "@/db";
import { listAdminProducts, type AdminProductRow } from "@/lib/admin/catalogue";
import { formatPrice, stockState } from "@/lib/catalog";

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <AdminPage
      title="Products"
      id="admin-products"
      actions={<Link href="/admin/products/new" className="btn btn-inverse btn-lg">Add product</Link>}
    >
      <AdminGate path="/admin/products">{async () => <Products searchParams={searchParams} />}</AdminGate>
    </AdminPage>
  );
}

async function Products({ searchParams }: { searchParams: PageProps<"/admin/products">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const includeArchived = one(sp.archived) === "1";
  const q = (one(sp.q) ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 100) || undefined;
  const rows = await listAdminProducts(db, { includeArchived, q });

  return (
    <div className="flex flex-col gap-6">
      <form method="get" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <div>
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" className="field" defaultValue={q ?? ""} placeholder="Product name" maxLength={100} />
        </div>
        <label className="flex items-center gap-3 pb-2 text-body">
          <input type="checkbox" name="archived" value="1" defaultChecked={includeArchived} className="size-4 accent-[var(--ink)]" />
          Include archived
        </label>
        <button type="submit" className="btn btn-inverse btn-lg">Filter</button>
      </form>

      <DataTable<AdminProductRow>
        caption="Products"
        rows={rows}
        rowKey={(p) => p.id}
        empty="No products match."
        columns={[
          {
            header: "Product",
            cell: (p) => (
              <span>
                <Link href={`/admin/products/${p.id}`} className="font-semibold underline underline-offset-4">{p.name}</Link>
                <span className="block text-muted">/{p.slug}</span>
              </span>
            ),
          },
          { header: "Category", cell: (p) => p.categoryName },
          { header: "Gender", cell: (p) => p.gender },
          { header: "Price", numeric: true, cell: (p) => formatPrice(p.priceCents, p.currency) },
          {
            header: "Stock",
            numeric: true,
            cell: (p) => (
              <span>
                {p.quantity}
                {stockState(p.quantity) !== "in-stock" ? (
                  <span className="ml-2 text-caption uppercase text-muted">
                    {stockState(p.quantity) === "sold-out" ? "Sold out" : "Low"}
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            header: "State",
            cell: (p) => (p.archivedAt ? <StatusBadge>Archived</StatusBadge> : <span className="text-muted">Live</span>),
          },
        ]}
      />
    </div>
  );
}
