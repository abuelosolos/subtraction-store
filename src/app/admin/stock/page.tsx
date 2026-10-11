import { AdminGate } from "@/components/admin/admin-gate";
import { AdminPage } from "@/components/admin/page-frame";
import { StockTable } from "@/components/admin/stock-table";
import { db } from "@/db";
import { listStockOverview } from "@/lib/admin/stock";

export default function AdminStockPage() {
  return (
    <AdminPage
      title="Stock"
      id="admin-stock"
      description="Available is what customers can buy right now. Units held by unpaid orders are already taken out and return automatically if the order expires."
    >
      <AdminGate path="/admin/stock">{async () => <Stock />}</AdminGate>
    </AdminPage>
  );
}

async function Stock() {
  const rows = await listStockOverview(db);
  return (
    <StockTable rows={rows} />
  );
}
