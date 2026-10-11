import type { Tone } from "@/components/admin/status-badge";

/** Tone for an order's payment status. Needs-a-human states are warm, done is green. */
export function orderTone(status: string): Tone {
  switch (status) {
    case "paid":
      return "ok";
    case "pending":
      return "warn";
    case "failed":
    case "payment_mismatch":
      return "bad";
    default:
      return "neutral";
  }
}

export function fulfilmentTone(status: string): Tone {
  switch (status) {
    case "delivered":
      return "ok";
    case "unfulfilled":
      return "warn";
    default:
      return "neutral";
  }
}
