import { AdminGate } from "@/components/admin/admin-gate";
import { AdminPage } from "@/components/admin/page-frame";
import { ProductForm } from "@/components/admin/product-form";
import { db } from "@/db";
import { listAdminCategories, listAttributeSuggestions } from "@/lib/admin/catalogue";

export default function NewProductPage() {
  return (
    <AdminPage title="New product" id="admin-new-product">
      <AdminGate path="/admin/products/new">{async () => <NewProduct />}</AdminGate>
    </AdminPage>
  );
}

async function NewProduct() {
  const [categories, suggestions] = await Promise.all([
    listAdminCategories(db),
    listAttributeSuggestions(db),
  ]);
  return (
    <ProductForm
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      suggestions={suggestions}
      values={{
        slug: "", name: "", description: "", categoryId: "", price: "", sizes: "", badge: "",
        isBestSeller: false, gender: "unisex", color: "Black", collection: "", image: { src: "", width: 0, height: 0, alt: "" }, initialStock: 0,
      }}
    />
  );
}
