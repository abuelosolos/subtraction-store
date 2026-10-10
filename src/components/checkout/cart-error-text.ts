import type { CartError } from "@/lib/pricing";

/** Human wording for a pricing error. Slugs are shown as the product's URL name. */
export function describeCartError(error: CartError): string {
  const name = "slug" in error ? error.slug.replace(/-/g, " ") : "";
  switch (error.code) {
    case "empty_cart":
      return "Your cart is empty.";
    case "too_many_lines":
      return "Your cart has too many different items.";
    case "invalid_quantity":
      return `Choose a quantity between 1 and 10 for ${name}.`;
    case "unknown_product":
      return `${name} is no longer available.`;
    case "size_required":
      return `Choose a size for ${name}.`;
    case "invalid_size":
      return `${error.size} is not available for ${name}.`;
    case "insufficient_stock":
      return error.available === 0
        ? `${name} is sold out.`
        : `Only ${error.available} of ${name} left (you have ${error.requested}).`;
    case "mixed_currency":
      return "Items in your cart use different currencies.";
    case "amount_too_large":
      return "This order is too large to process online.";
  }
}
