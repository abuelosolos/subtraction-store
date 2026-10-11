import Link from "next/link";

import { AdminGate } from "@/components/admin/admin-gate";
import { RenameCell } from "@/components/admin/rename-cell";
import { DataTable } from "@/components/admin/data-table";
import { AdminPage } from "@/components/admin/page-frame";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { StatusBadge } from "@/components/admin/status-badge";
import { db } from "@/db";
import { listAdminProducts, type AdminProductRow } from "@/lib/admin/catalogue";
import { formatPrice, stockState } from "@/lib/catalog";

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <AdminPage
      title="Products"
      id="admin-products"
      actions={<Link href="/admin/products/new" className="btn btn-inverse">Add product</Link>}
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

  const tabHref = (archived: boolean) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (archived) qs.set("archived", "1");
    const s = qs.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <FilterTabs
        label="Product visibility"
        tabs={[
          { label: "Live", href: tabHref(false), active: !includeArchived },
          { label: "Live and archived", href: tabHref(true), active: includeArchived },
        ]}
      />

      <form method="get" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        {includeArchived ? <input type="hidden" name="archived" value="1" /> : null}
        <div>
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" type="search" className="field" defaultValue={q ?? ""} placeholder="Product name" maxLength={100} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-inverse btn-lg">Search</button>
          {q ? <Link href={includeArchived ? "/admin/products?archived=1" : "/admin/products"} className="btn btn-outline btn-lg">Reset</Link> : null}
        </div>
      </form>

      <p role="status" className="text-body text-muted">
        {rows.length} {rows.length === 1 ? "product" : "products"}
      </p>

      <DataTable<AdminProductRow>
        caption="Products"
        rows={rows}
        rowKey={(p) => p.id}
        empty="No products match."
        columns={[
          {
            header: "Product",
            cell: (p) => <RenameCell id={p.id} name={p.name} slug={p.slug} />,
          },
          { header: "Category", cell: (p) => p.categoryName },
          { header: "Gender", cell: (p) => <span className="capitalize">{p.gender}</span> },
          { header: "Price", numeric: true, cell: (p) => formatPrice(p.priceCents, p.currency) },
          { header: "Stock", numeric: true, cell: (p) => p.quantity },
          {
            header: "State",
            cell: (p) => {
              if (p.archivedAt) return <StatusBadge>Archived</StatusBadge>;
              const st = stockState(p.quantity);
              if (st === "sold-out") return <StatusBadge tone="bad">Sold out</StatusBadge>;
              if (st !== "in-stock") return <StatusBadge tone="warn">Low stock</StatusBadge>;
              return <StatusBadge tone="ok">Live</StatusBadge>;
            },
          },
        ]}
      />

      <form method="get" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        {includeArchived ? <input type="hidden" name="archived" value="1" /> : null}
        <div>
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" type="search" className="field" defaultValue={q ?? ""} placeholder="Product name" maxLength={100} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-inverse btn-lg">Search</button>
          {q ? <Link href={includeArchived ? "/admin/products?archived=1" : "/admin/products"} className="btn btn-outline btn-lg">Reset</Link> : null}
        </div>
      </form>

      <p role="status" className="text-body text-muted">
        {rows.length} {rows.length === 1 ? "product" : "products"}
      </p>

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
                <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                <span className="block text-caption text-muted">/{p.slug}</span>
              </span>
            ),
          },
          { header: "Category", cell: (p) => p.categoryName },
          { header: "Gender", cell: (p) => <span className="capitalize">{p.gender}</span> },
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
