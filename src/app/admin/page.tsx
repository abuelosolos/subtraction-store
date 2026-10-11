import Link from "next/link";

import { AdminGate } from "@/components/admin/admin-gate";
import { AdminPage } from "@/components/admin/page-frame";
import { db } from "@/db";
import { getAttentionCounts } from "@/lib/admin/orders";

export default function AdminOverviewPage() {
  return (
    <AdminPage title="Overview" id="admin-overview">
      <AdminGate path="/admin">{async () => <Overview />}</AdminGate>
    </AdminPage>
  );
}

async function Overview() {
  const c = await getAttentionCounts(db);
  const cards = [
    { label: "Orders under review", value: c.mismatch, href: "/admin/orders?status=payment_mismatch", note: "Paid amount didn't match; needs a human." },
    { label: "Paid, not yet shipped", value: c.toFulfil, href: "/admin/orders?status=paid&fulfilment=unfulfilled", note: "Ready to pack and send." },
    { label: "Awaiting payment", value: c.pending, href: "/admin/orders?status=pending", note: "Stock held for up to 30 minutes." },
    { label: "Low or out of stock", value: c.lowStock, href: "/admin/stock", note: "At or below the low-stock threshold." },
  ];
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <li key={card.label}>
          <Link href={card.href} className="block border border-line/30 p-6 hover:bg-ink/5">
            <span className="block text-heading-2 font-semibold">{card.value}</span>
            <span className="mt-1 block text-body font-semibold">{card.label}</span>
            <span className="mt-1 block text-body text-muted">{card.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
