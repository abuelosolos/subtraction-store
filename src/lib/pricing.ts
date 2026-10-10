// Cart pricing. Pure and DB-free so it can be unit-tested; the caller loads
// fresh product rows (never the cached catalogue reads) and passes them in.
// Client input is only {slug, size, quantity}: prices, totals and currency are
// always taken from the products argument.

/**
 * Flat shipping rates in kobo, chosen server-side from the delivery country.
 * PLACEHOLDERS for payment testing (₦3,500 domestic, ₦25,000 international):
 * replace with the real rates. Changing them only affects new orders; existing
 * orders keep their snapshot.
 */
export const SHIPPING_DOMESTIC_KOBO = 350_000;
export const SHIPPING_INTERNATIONAL_KOBO = 2_500_000;
export const DOMESTIC_COUNTRY = "NG";

export const shippingKoboFor = (country: string) =>
  country.toUpperCase() === DOMESTIC_COUNTRY ? SHIPPING_DOMESTIC_KOBO : SHIPPING_INTERNATIONAL_KOBO;

export const MAX_LINES = 20;
export const MAX_QUANTITY_PER_LINE = 10;
/** Postgres `integer` ceiling; totals above it cannot be stored. */
const MAX_AMOUNT_KOBO = 2_147_483_647;

export type CartLineInput = {
  slug: string;
  size?: string | null;
  quantity: number;
};

/** The server-side facts about a product that pricing needs. */
export type PricedProduct = {
  id: number;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  /** Units available right now (per product; sizes are display-only). */
  stock: number;
  sizes: string[];
};

export type PricedLine = {
  productId: number;
  slug: string;
  name: string;
  size: string | null;
  quantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
};

export type CartError =
  | { code: "empty_cart" }
  | { code: "too_many_lines" }
  | { code: "invalid_quantity"; slug: string }
  | { code: "unknown_product"; slug: string }
  | { code: "size_required"; slug: string }
  | { code: "invalid_size"; slug: string; size: string }
  | { code: "insufficient_stock"; slug: string; available: number; requested: number }
  | { code: "mixed_currency" }
  | { code: "amount_too_large" };

export type PricedCart =
  | {
      ok: true;
      currency: string;
      lines: PricedLine[];
      subtotalKobo: number;
      shippingKobo: number;
      totalKobo: number;
    }
  | { ok: false; errors: CartError[] };

export function priceCart(
  input: readonly CartLineInput[],
  productsBySlug: ReadonlyMap<string, PricedProduct>,
  /** ISO 3166-1 alpha-2 delivery country; selects the shipping rate. */
  country: string,
): PricedCart {
  if (input.length === 0) return { ok: false, errors: [{ code: "empty_cart" }] };
  if (input.length > MAX_LINES) return { ok: false, errors: [{ code: "too_many_lines" }] };

  const errors: CartError[] = [];
  // Merge repeated slug+size lines so a client cannot dodge limits by splitting.
  const merged = new Map<string, { product: PricedProduct; size: string | null; quantity: number }>();

  for (const line of input) {
    const { slug } = line;
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > MAX_QUANTITY_PER_LINE
    ) {
      errors.push({ code: "invalid_quantity", slug });
      continue;
    }

    const product = productsBySlug.get(slug);
    if (!product) {
      errors.push({ code: "unknown_product", slug });
      continue;
    }

    let size: string | null = null;
    if (product.sizes.length > 0) {
      if (!line.size) {
        errors.push({ code: "size_required", slug });
        continue;
      }
      if (!product.sizes.includes(line.size)) {
        errors.push({ code: "invalid_size", slug, size: line.size });
        continue;
      }
      size = line.size;
    }
    // A size sent for a one-size product is ignored rather than trusted.

    const key = `${slug}\u0000${size ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += line.quantity;
    else merged.set(key, { product, size, quantity: line.quantity });
  }

  // Stock is per product, so check the total across sizes.
  const requestedByProduct = new Map<string, number>();
  for (const { product, quantity } of merged.values()) {
    requestedByProduct.set(product.slug, (requestedByProduct.get(product.slug) ?? 0) + quantity);
  }
  for (const [slug, requested] of requestedByProduct) {
    const available = productsBySlug.get(slug)!.stock;
    if (requested > available) {
      errors.push({ code: "insufficient_stock", slug, available, requested });
    }
  }

  const currencies = new Set([...merged.values()].map(({ product }) => product.currency));
  if (currencies.size > 1) errors.push({ code: "mixed_currency" });

  if (errors.length > 0) return { ok: false, errors };

  const lines: PricedLine[] = [...merged.values()].map(({ product, size, quantity }) => ({
    productId: product.id,
    slug: product.slug,
    name: product.name,
    size,
    quantity,
    unitPriceKobo: product.priceCents,
    lineTotalKobo: product.priceCents * quantity,
  }));

  const subtotalKobo = lines.reduce((sum, l) => sum + l.lineTotalKobo, 0);
  const shippingKobo = shippingKoboFor(country);
  const totalKobo = subtotalKobo + shippingKobo;
  if (totalKobo > MAX_AMOUNT_KOBO) return { ok: false, errors: [{ code: "amount_too_large" }] };

  return {
    ok: true,
    currency: [...currencies][0],
    lines,
    subtotalKobo,
    shippingKobo,
    totalKobo,
  };
}
