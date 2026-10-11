import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminCard } from "@/components/admin/admin-card";
import { AdminGate } from "@/components/admin/admin-gate";
import { AdminPage } from "@/components/admin/page-frame";
import { ProductForm } from "@/components/admin/product-form";
import { db } from "@/db";
import { getAdminProduct, listAdminCategories, listAttributeSuggestions } from "@/lib/admin/catalogue";
import { listStockHistory } from "@/lib/admin/stock";

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <AdminPage
      title="Edit product"
      id="admin-edit-product"
      crumbs={[{ label: "Products", href: "/admin/products" }, { label: "Edit product" }]}
    >
      <AdminGate path="/admin/products">{async () => <EditProduct params={params} />}</AdminGate>
    </AdminPage>
  );
}

async function EditProduct({ params }: { params: PageProps<"/admin/products/[id]">["params"] }) {
  const id = z.coerce.number().int().positive().safeParse((await params).id);
  if (!id.success) notFound();
  const [product, categories, suggestions, history] = await Promise.all([
    getAdminProduct(db, id.data),
    listAdminCategories(db),
    listAttributeSuggestions(db),
    listStockHistory(db, id.data, 10),
  ]);
  if (!product) notFound();

  const price = product.priceCents % 100 === 0
    ? String(product.priceCents / 100)
    : (product.priceCents / 100).toFixed(2);

  return (
    <div className="flex flex-col gap-6">
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        suggestions={suggestions}
        values={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          price,
          sizes: product.sizes.join(", "),
          badge: product.badge ?? "",
          isBestSeller: product.isBestSeller,
          gender: product.gender,
          color: product.color,
          collection: product.collection ?? "",
          image: { src: product.imageSrc, width: product.imageWidth, height: product.imageHeight, alt: product.imageAlt },
          archived: product.archivedAt !== null,
        }}
      />
      <AdminCard title="Recent stock changes" className="max-w-3xl" flush>
        <p className="px-5 pt-4 text-body text-muted">Currently {product.quantity} available.</p>
        {history.length === 0 ? (
          <p className="px-5 py-4 text-body text-muted">No manual adjustments yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--admin-border)] border-t border-[var(--admin-border)] text-body">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                <span>
                  <span className="font-medium tabular-nums">{h.delta > 0 ? `+${h.delta}` : h.delta}</span> · {h.reason}
                  {h.note ? ` · ${h.note}` : ""}
                </span>
                <span className="text-muted">now {h.quantityAfter} · {h.createdAt.toLocaleString("en-GB")}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
