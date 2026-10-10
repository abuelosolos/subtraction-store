import { createLocalStore } from "@/lib/local-store";
import { MAX_LINES, MAX_QUANTITY_PER_LINE } from "@/lib/pricing";

/**
 * The cart holds only what the shopper chose. Prices, names and stock are
 * looked up on the server; nothing here is ever trusted as a price.
 */
export type CartLine = { slug: string; size: string | null; quantity: number };

const EMPTY: CartLine[] = [];

const clampQuantity = (n: number) =>
  Math.min(MAX_QUANTITY_PER_LINE, Math.max(1, Math.trunc(n)));

function parse(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return EMPTY;
  const out: CartLine[] = [];
  for (const item of raw) {
    if (out.length >= MAX_LINES) break;
    if (!item || typeof item !== "object") continue;
    const { slug, size, quantity } = item as Record<string, unknown>;
    if (typeof slug !== "string" || slug.length === 0 || slug.length > 100) continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) continue;
    out.push({
      slug,
      size: typeof size === "string" && size.length <= 20 ? size : null,
      quantity: clampQuantity(quantity),
    });
  }
  return out;
}

const store = createLocalStore<CartLine[]>("subtraction.cart.v1", EMPTY, parse);

export const useCart = store.useStore;

const same = (a: CartLine, slug: string, size: string | null) =>
  a.slug === slug && a.size === size;

/** Returns false when the cart is full (MAX_LINES distinct lines). */
export function addToCart(slug: string, size: string | null, quantity = 1): boolean {
  const lines = store.read();
  const existing = lines.find((l) => same(l, slug, size));
  if (existing) {
    store.write(
      lines.map((l) =>
        l === existing ? { ...l, quantity: clampQuantity(l.quantity + quantity) } : l,
      ),
    );
    return true;
  }
  if (lines.length >= MAX_LINES) return false;
  store.write([...lines, { slug, size, quantity: clampQuantity(quantity) }]);
  return true;
}

export function setCartQuantity(slug: string, size: string | null, quantity: number) {
  store.write(
    store
      .read()
      .map((l) => (same(l, slug, size) ? { ...l, quantity: clampQuantity(quantity) } : l)),
  );
}

export function removeFromCart(slug: string, size: string | null) {
  store.write(store.read().filter((l) => !same(l, slug, size)));
}

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);

export function clearCart() {
  store.write(EMPTY);
}
