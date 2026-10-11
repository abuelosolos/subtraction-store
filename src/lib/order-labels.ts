/** Customer- and admin-facing labels for order and fulfilment states. */
export const orderStatusLabel: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  expired: "Expired",
  failed: "Failed",
  payment_mismatch: "Under review",
  refunded: "Refunded",
};

export const fulfilmentLabel: Record<string, string> = {
  unfulfilled: "Preparing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
};

export const FULFILMENT_STEPS = ["unfulfilled", "packed", "shipped", "delivered"] as const;
export type FulfilmentStep = (typeof FULFILMENT_STEPS)[number];
