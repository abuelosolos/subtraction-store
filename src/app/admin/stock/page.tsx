import { AdminGate } from "@/components/admin/admin-gate";
import { AdminPage } from "@/components/admin/page-frame";
import { StockTable } from "@/components/admin/stock-table";
import { db } from "@/db";
import { listStockOverview } from "@/lib/admin/stock";

export default function AdminStockPage() {
  return (
    <AdminPage title="Stock" id="admin-stock">
      <AdminGate path="/admin/stock">{async () => <Stock />}</AdminGate>
    </AdminPage>
  );
}

async function Stock() {
  const rows = await listStockOverview(db);
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-body text-muted">
        Available is what customers can buy right now. Units held by unpaid orders are already taken out and
        return automatically if the order expires.
      </p>
      <StockTable rows={rows} />
    </div>
  );
}
