import Link from "next/link";

import type { AccountOrder } from "@/lib/account-orders";
import { formatPrice } from "@/lib/catalog";
import { fulfilmentLabel, orderStatusLabel } from "@/lib/order-labels";

export function OrderList({ orders }: { orders: AccountOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center text-body text-ink/40">
        <p>You haven&apos;t placed any orders yet</p>
        <p>Shop new arrivals</p>
        <Link
          href="/new-arrivals"
          aria-label="Shop new arrivals"
          className="mt-8 flex size-20 items-center justify-center rounded-pill border-hairline text-ink/40 transition-colors duration-[var(--duration-standard)] ease-[var(--ease-standard)] hover:border-ink hover:text-ink focus-visible:text-ink"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line/30 border-y border-line/30">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/orders/${order.id}`}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-5 hover:bg-ink/5"
          >
            <span>
              <span className="block text-body font-semibold">
                {order.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                <span className="ml-3 text-caption font-normal uppercase text-subtle">
                  #{order.id.slice(0, 8)}
                </span>
              </span>
              <span className="block text-body text-muted">
                {order.itemCount} {order.itemCount === 1 ? "item" : "items"} · {order.status === "paid" ? (fulfilmentLabel[order.fulfilmentStatus] ?? "Paid") : (orderStatusLabel[order.status] ?? order.status)}
              </span>
            </span>
            <span className="flex items-center gap-4 text-body font-medium">
              {order.status === "pending" ? <span className="text-caption uppercase underline">Continue to pay</span> : null}
              {formatPrice(order.totalKobo, order.currency)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
