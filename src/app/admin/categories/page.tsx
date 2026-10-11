import { AdminGate } from "@/components/admin/admin-gate";
import { CategoryManager } from "@/components/admin/category-manager";
import { AdminPage } from "@/components/admin/page-frame";
import { db } from "@/db";
import { listAdminCategories } from "@/lib/admin/catalogue";

export default function AdminCategoriesPage() {
  return (
    <AdminPage title="Categories" id="admin-categories">
      <AdminGate path="/admin/categories">{async () => <Categories />}</AdminGate>
    </AdminPage>
  );
}

async function Categories() {
  const categories = await listAdminCategories(db);
  return <CategoryManager categories={categories} />;
}
