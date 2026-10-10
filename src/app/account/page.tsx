import type { Metadata } from "next";
import { Suspense } from "react";

import { db } from "@/db";
import { OrderList } from "@/components/account/order-list";
import { getOrdersForUser } from "@/lib/account-orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your orders | SUBTRACTION.",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <section aria-labelledby="account-heading">
      <h1 id="account-heading" className="text-heading-2 font-semibold">Your orders</h1>
      <div className="pt-8">
        <Suspense fallback={<p role="status" className="text-body text-muted">Loading your orders</p>}>
          <Orders />
        </Suspense>
      </div>
    </section>
  );
}

async function Orders() {
  const user = await requireUser("/account");
  const orders = await getOrdersForUser(db, user.id);
  return <OrderList orders={orders} />;
}
