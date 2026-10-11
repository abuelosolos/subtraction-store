import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminGate } from "@/components/admin/admin-gate";
import { AdminPage } from "@/components/admin/page-frame";
import { ProductForm } from "@/components/admin/product-form";
import { db } from "@/db";
import { getAdminProduct, listAdminCategories, listAttributeSuggestions } from "@/lib/admin/catalogue";
import { listStockHistory } from "@/lib/admin/stock";

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <AdminPage title="Edit product" id="admin-edit-product">
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
    <div className="flex flex-col gap-12">
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
      <section aria-labelledby="history-heading" className="max-w-2xl">
        <h2 id="history-heading" className="text-heading-3 font-semibold">Recent stock changes</h2>
        <p className="mt-1 text-body text-muted">Currently {product.quantity} available.</p>
        {history.length === 0 ? (
          <p className="mt-4 text-body text-muted">No manual adjustments yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-line/30 border-y border-line/30 text-body">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{h.delta > 0 ? `+${h.delta}` : h.delta} · {h.reason}{h.note ? ` · ${h.note}` : ""}</span>
                <span className="text-muted">now {h.quantityAfter} · {h.createdAt.toLocaleString("en-GB")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
