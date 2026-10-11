import { describe, expect, it } from "vitest";

import { MAX_SEARCH_RESULTS, searchProducts, type SearchItem } from "@/lib/search";

const item = (name: string, category: string, stock = 5): SearchItem => ({
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  category,
  priceCents: 100_000,
  currency: "NGN",
  stock,
  image: { src: "/images/x.webp", width: 10, height: 10, alt: "" },
});

const index = [
  item("Heavyweight Tee", "T-shirts"),
  item("Everyday Hoodie", "Hoodies", 0),
  item("Gloss Puffer Jacket", "Outerwear"),
  item("Tee Dress", "Women"),
  item("Canvas Cap", "Accessories"),
  item("Low Leather Sneaker", "Footwear"),
];

describe("searchProducts", () => {
  it("returns nothing for an empty or whitespace query", () => {
    expect(searchProducts(index, "")).toEqual([]);
    expect(searchProducts(index, "   ")).toEqual([]);
  });

  it("is case-insensitive and matches name or category", () => {
    expect(searchProducts(index, "HOODIE").map((r) => r.name)).toEqual(["Everyday Hoodie"]);
    expect(searchProducts(index, "footwear").map((r) => r.name)).toEqual(["Low Leather Sneaker"]);
  });

  it("requires every token to match somewhere", () => {
    expect(searchProducts(index, "leather sneaker").map((r) => r.name)).toEqual(["Low Leather Sneaker"]);
    expect(searchProducts(index, "leather hoodie")).toEqual([]);
  });

  it("ranks name-prefix matches before other name matches before category matches", () => {
    const r = searchProducts(
      [item("Black Tee", "Basics"), item("Tee Dress", "Women"), item("Hat", "Tee accessories")],
      "tee",
    );
    expect(r.map((x) => x.name)).toEqual(["Tee Dress", "Black Tee", "Hat"]);
  });

  it("keeps sold-out items in the results", () => {
    const r = searchProducts(index, "hoodie");
    expect(r[0].stock).toBe(0);
  });

  it("caps the number of results", () => {
    const many = Array.from({ length: MAX_SEARCH_RESULTS + 20 }, (_, i) => item(`Tee ${i}`, "T-shirts"));
    expect(searchProducts(many, "tee")).toHaveLength(MAX_SEARCH_RESULTS);
  });

  it("treats regex characters in the query literally", () => {
    expect(searchProducts(index, ".*")).toEqual([]);
    expect(searchProducts(index, "(")).toEqual([]);
    expect(searchProducts([item("Cap (Limited)", "Accessories")], "(limited")).toHaveLength(1);
  });

  it("ignores punctuation and spacing: tshirt / t shirt find T-shirts", () => {
    expect(searchProducts(index, "tshirt").map((r) => r.name)).toContain("Heavyweight Tee");
    expect(searchProducts(index, "t shirt").map((r) => r.name)).toContain("Heavyweight Tee");
    expect(searchProducts(index, "T-SHIRTS").map((r) => r.name)).toContain("Heavyweight Tee");
  });

  it("matches simple plurals against singular names", () => {
    expect(searchProducts(index, "sneakers").map((r) => r.name)).toEqual(["Low Leather Sneaker"]);
    expect(searchProducts([item("Wrap Dress", "Women")], "dresses")).toHaveLength(1);
    expect(searchProducts(index, "caps").map((r) => r.name)).toEqual(["Canvas Cap"]);
  });

  it("matches part of a name", () => {
    expect(searchProducts(index, "hood").map((r) => r.name)).toEqual(["Everyday Hoodie"]);
    expect(searchProducts(index, "puff").map((r) => r.name)).toEqual(["Gloss Puffer Jacket"]);
  });

  it("a category name lists every product in that category", () => {
    const shop = [
      item("Everyday Hoodie", "Hoodies"),
      item("Zip Hoodie", "Hoodies"),
      item("Heavy Tee", "T-shirts"),
    ];
    expect(searchProducts(shop, "hoodies").map((r) => r.name)).toEqual(["Everyday Hoodie", "Zip Hoodie"]);
  });

  it("a punctuation-only query returns nothing", () => {
    expect(searchProducts(index, "---")).toEqual([]);
    expect(searchProducts(index, "  ?! ")).toEqual([]);
  });
});
