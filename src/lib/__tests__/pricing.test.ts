import { describe, expect, it } from "vitest";

import {
  MAX_LINES,
  MAX_QUANTITY_PER_LINE,
  SHIPPING_DOMESTIC_KOBO,
  SHIPPING_INTERNATIONAL_KOBO,
  priceCart,
  type PricedProduct,
} from "@/lib/pricing";

const product = (over: Partial<PricedProduct> & { slug: string }): PricedProduct => ({
  id: 1,
  name: over.slug,
  priceCents: 100_000,
  currency: "NGN",
  stock: 10,
  sizes: [],
  ...over,
});

const catalogue = (...items: PricedProduct[]) => new Map(items.map((p) => [p.slug, p]));

const errorsOf = (result: ReturnType<typeof priceCart>) => {
  if (result.ok) throw new Error("expected errors");
  return result.errors;
};

describe("priceCart totals", () => {
  it("prices from the catalogue and adds domestic shipping", () => {
    const products = catalogue(product({ slug: "tee", priceCents: 45_000_00, id: 7, name: "Tee" }));
    const result = priceCart([{ slug: "tee", quantity: 2 }], products, "NG");
    expect(result).toMatchObject({
      ok: true,
      currency: "NGN",
      subtotalKobo: 90_000_00,
      shippingKobo: SHIPPING_DOMESTIC_KOBO,
      totalKobo: 90_000_00 + SHIPPING_DOMESTIC_KOBO,
    });
    if (result.ok) {
      expect(result.lines[0]).toMatchObject({ productId: 7, name: "Tee", unitPriceKobo: 45_000_00 });
    }
  });

  it("uses the international rate for any other country, case-insensitively", () => {
    const products = catalogue(product({ slug: "tee" }));
    for (const country of ["GB", "us", "GH"]) {
      const result = priceCart([{ slug: "tee", quantity: 1 }], products, country);
      expect(result).toMatchObject({ ok: true, shippingKobo: SHIPPING_INTERNATIONAL_KOBO });
    }
    const ng = priceCart([{ slug: "tee", quantity: 1 }], products, "ng");
    expect(ng).toMatchObject({ ok: true, shippingKobo: SHIPPING_DOMESTIC_KOBO });
  });

  it("ignores any client-supplied price, total or currency fields", () => {
    const products = catalogue(product({ slug: "tee", priceCents: 50_000 }));
    const forged = { slug: "tee", quantity: 1, priceCents: 1, unitPriceKobo: 1, currency: "USD", totalKobo: 1 };
    const result = priceCart([forged], products, "NG");
    expect(result).toMatchObject({ ok: true, subtotalKobo: 50_000, currency: "NGN" });
  });

  it("merges repeated slug+size lines and checks the merged quantity", () => {
    const products = catalogue(product({ slug: "tee" }));
    const result = priceCart(
      [
        { slug: "tee", quantity: 3 },
        { slug: "tee", quantity: 4 },
      ],
      products,
      "NG",
    );
    expect(result).toMatchObject({ ok: true, subtotalKobo: 700_000 });
    if (result.ok) expect(result.lines).toHaveLength(1);
  });
});

describe("priceCart rejections", () => {
  const products = catalogue(
    product({ slug: "tee" }),
    product({ slug: "hoodie", id: 2, sizes: ["S", "M"] }),
    product({ slug: "scarce", id: 3, stock: 2 }),
    product({ slug: "usd-item", id: 4, currency: "USD" }),
  );

  it("rejects an empty cart and too many lines", () => {
    expect(errorsOf(priceCart([], products, "NG"))).toEqual([{ code: "empty_cart" }]);
    const many = Array.from({ length: MAX_LINES + 1 }, () => ({ slug: "tee", quantity: 1 }));
    expect(errorsOf(priceCart(many, products, "NG"))).toEqual([{ code: "too_many_lines" }]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_QUANTITY_PER_LINE + 1, 1e9])(
    "rejects quantity %s",
    (quantity) => {
      expect(errorsOf(priceCart([{ slug: "tee", quantity }], products, "NG"))).toEqual([
        { code: "invalid_quantity", slug: "tee" },
      ]);
    },
  );

  it("rejects unknown products", () => {
    expect(errorsOf(priceCart([{ slug: "nope", quantity: 1 }], products, "NG"))).toEqual([
      { code: "unknown_product", slug: "nope" },
    ]);
  });

  it("requires a valid size for sized products and ignores size on one-size products", () => {
    expect(errorsOf(priceCart([{ slug: "hoodie", quantity: 1 }], products, "NG"))).toEqual([
      { code: "size_required", slug: "hoodie" },
    ]);
    expect(
      errorsOf(priceCart([{ slug: "hoodie", size: "XXL", quantity: 1 }], products, "NG")),
    ).toEqual([{ code: "invalid_size", slug: "hoodie", size: "XXL" }]);
    const ok = priceCart([{ slug: "tee", size: "whatever", quantity: 1 }], products, "NG");
    expect(ok.ok && ok.lines[0].size).toBe(null);
  });

  it("checks stock across sizes of the same product", () => {
    const result = priceCart(
      [
        { slug: "scarce", quantity: 1 },
        { slug: "scarce", size: null, quantity: 2 },
      ],
      products,
      "NG",
    );
    // Same slug + null size merges to 3 requested against 2 in stock.
    expect(errorsOf(result)).toEqual([
      { code: "insufficient_stock", slug: "scarce", available: 2, requested: 3 },
    ]);
  });

  it("rejects mixed currencies and amounts above the integer ceiling", () => {
    expect(
      errorsOf(
        priceCart(
          [
            { slug: "tee", quantity: 1 },
            { slug: "usd-item", quantity: 1 },
          ],
          products,
          "NG",
        ),
      ),
    ).toEqual([{ code: "mixed_currency" }]);

    const huge = catalogue(product({ slug: "gem", priceCents: 2_000_000_000, stock: 100 }));
    expect(errorsOf(priceCart([{ slug: "gem", quantity: 2 }], huge, "NG"))).toEqual([
      { code: "amount_too_large" },
    ]);
  });
});
