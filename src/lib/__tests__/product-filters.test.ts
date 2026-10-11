import { describe, expect, it } from "vitest";

import type { Product } from "@/lib/catalog";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyFilters,
  buildFacets,
  compareSizes,
  groupByCategory,
  listingTitle,
  parseFilters,
  serializeFilters,
  type Filters,
} from "@/lib/product-filters";

const p = (over: Partial<Product> & { slug: string }): Product => ({
  name: over.slug,
  category: "Footwear",
  categorySlug: "footwear",
  priceCents: 100_000,
  currency: "NGN",
  image: { src: "/x.webp", width: 1, height: 1, alt: "" },
  stock: 5,
  description: "",
  sizes: [],
  gender: "unisex",
  color: "Black",
  ...over,
});

const catalogue = [
  p({ slug: "m-boot", gender: "men", sizes: ["41", "42", "43"], collection: "Core" }),
  p({ slug: "w-boot", gender: "women", sizes: ["37", "38", "39"], color: "Grey" }),
  p({ slug: "u-sneaker", gender: "unisex", sizes: ["38", "42", "44"], collection: "Core" }),
  p({ slug: "m-tee", category: "T-shirts", gender: "men", sizes: ["S", "M", "L", "XL"] }),
];

const f = (over: Partial<Filters>): Filters => ({ ...EMPTY_FILTERS, ...over });
const slugs = (list: Product[]) => list.map((x) => x.slug);

describe("applyFilters", () => {
  it("returns everything with no filters", () => {
    expect(applyFilters(catalogue, EMPTY_FILTERS)).toHaveLength(4);
  });

  it("gender: a selected gender also shows unisex pieces", () => {
    expect(slugs(applyFilters(catalogue, f({ gender: ["men"] })))).toEqual(["m-boot", "u-sneaker", "m-tee"]);
    expect(slugs(applyFilters(catalogue, f({ gender: ["women"] })))).toEqual(["w-boot", "u-sneaker"]);
  });

  it("gender: both genders show everyone", () => {
    expect(applyFilters(catalogue, f({ gender: ["men", "women"] }))).toHaveLength(4);
  });

  it("ORs within a group and ANDs across groups", () => {
    expect(slugs(applyFilters(catalogue, f({ size: ["37", "44"] })))).toEqual(["w-boot", "u-sneaker"]);
    expect(slugs(applyFilters(catalogue, f({ size: ["42"], gender: ["men"] })))).toEqual(["m-boot", "u-sneaker"]);
    expect(slugs(applyFilters(catalogue, f({ size: ["42"], color: ["Grey"] })))).toEqual([]);
  });

  it("collection only matches products that have one", () => {
    expect(slugs(applyFilters(catalogue, f({ collection: ["Core"] })))).toEqual(["m-boot", "u-sneaker"]);
  });
});

describe("buildFacets", () => {
  it("builds size options from the listing, numeric ascending, letters in order", () => {
    const shoes = buildFacets(catalogue.slice(0, 3), EMPTY_FILTERS).find((x) => x.key === "size")!;
    expect(shoes.options.map((o) => o.value)).toEqual(["37", "38", "39", "41", "42", "43", "44"]);
    const tees = buildFacets([catalogue[3]], EMPTY_FILTERS).find((x) => x.key === "size")!;
    expect(tees.options.map((o) => o.value)).toEqual(["S", "M", "L", "XL"]);
  });

  it("counts apply the other active filters, not the facet's own", () => {
    const facets = buildFacets(catalogue, f({ gender: ["men"] }));
    const size = facets.find((x) => x.key === "size")!;
    // men + unisex products: m-boot(41,42,43), u-sneaker(38,42,44), m-tee(S..XL)
    expect(size.options.find((o) => o.value === "42")!.count).toBe(2);
    // 37 is only offered on a women's boot, so it is not listed under Men.
    expect(size.options.find((o) => o.value === "37")).toBeUndefined();
    const gender = facets.find((x) => x.key === "gender")!;
    // gender counts ignore the gender filter itself
    expect(gender.options.find((o) => o.value === "women")!.count).toBe(2);
    expect(gender.options.find((o) => o.value === "men")!.selected).toBe(true);
  });

  it("omits groups with no values (collection before any are set)", () => {
    const none = buildFacets([p({ slug: "a" }), p({ slug: "b" })], EMPTY_FILTERS);
    expect(none.map((x) => x.key)).not.toContain("collection");
    expect(none.map((x) => x.key)).toContain("color");
  });
});

describe("compareSizes", () => {
  it("sorts numbers numerically and letters in garment order", () => {
    expect(["10", "9", "42", "8.5"].sort(compareSizes)).toEqual(["8.5", "9", "10", "42"]);
    expect(["XL", "S", "XXL", "M", "L", "3XL"].sort(compareSizes)).toEqual(["S", "M", "L", "XL", "XXL", "3XL"]);
  });
});

describe("listingTitle", () => {
  it("prefixes the category with a single selected gender", () => {
    expect(listingTitle("Footwear", ["men"])).toBe("Men's Footwear");
    expect(listingTitle("Footwear", ["women"])).toBe("Women's Footwear");
  });

  it("drops the prefix when both genders or none are selected", () => {
    expect(listingTitle("Footwear", ["men", "women"])).toBe("Footwear");
    expect(listingTitle("Footwear", [])).toBe("Footwear");
  });

  it("gender views without a category", () => {
    expect(listingTitle(null, ["men"])).toBe("Men's");
    expect(listingTitle(null, ["women"])).toBe("Women's");
    expect(listingTitle(null, ["men", "women"])).toBe("All products");
    expect(listingTitle(null, [])).toBe("All products");
  });
});

describe("parseFilters / serializeFilters", () => {
  it("round-trips repeated params", () => {
    const filters = f({ gender: ["men"], size: ["M", "L"], color: ["Black"] });
    const qs = serializeFilters(filters);
    expect(qs).toBe("gender=men&size=M&size=L&color=Black");
    expect(parseFilters(new URLSearchParams(qs))).toEqual(filters);
  });

  it("accepts Next searchParams objects", () => {
    expect(parseFilters({ size: ["M", "L"], gender: "women" })).toMatchObject({ size: ["M", "L"], gender: ["women"] });
  });

  it("ignores junk: bad genders, duplicates, control chars, over-long values", () => {
    const r = parseFilters({
      gender: ["men", "robots", "men"],
      size: ["M", "M", "  ", "x".repeat(200), "L\u0000"],
    });
    expect(r.gender).toEqual(["men"]);
    expect(r.size).toEqual(["M", "L"]);
  });

  it("drops values the listing does not offer when scope is given", () => {
    const r = parseFilters({ size: ["42", "99"], color: ["Black", "Pink"] }, catalogue);
    expect(r.size).toEqual(["42"]);
    expect(r.color).toEqual(["Black"]);
  });

  it("counts active filters", () => {
    expect(activeFilterCount(f({ gender: ["men"], size: ["M", "L"] }))).toBe(3);
  });
});

describe("category filter", () => {
  const shop = [
    p({ slug: "boot", category: "Footwear", categorySlug: "footwear" }),
    p({ slug: "sneaker", category: "Footwear", categorySlug: "footwear" }),
    p({ slug: "hood", category: "Hoodies", categorySlug: "hoodies" }),
    p({ slug: "cap", category: "Accessories", categorySlug: "accessories" }),
  ];

  it("filters by category slug and ORs several categories", () => {
    expect(slugs(applyFilters(shop, f({ category: ["footwear"] })))).toEqual(["boot", "sneaker"]);
    expect(slugs(applyFilters(shop, f({ category: ["hoodies", "accessories"] })))).toEqual(["hood", "cap"]);
  });

  it("builds a category facet with names, ordered by name, with counts", () => {
    const facet = buildFacets(shop, EMPTY_FILTERS).find((x) => x.key === "category")!;
    expect(facet.options.map((o) => o.label)).toEqual(["Accessories", "Footwear", "Hoodies"]);
    expect(facet.options.map((o) => o.value)).toEqual(["accessories", "footwear", "hoodies"]);
    expect(facet.options.find((o) => o.value === "footwear")!.count).toBe(2);
  });

  it("omits the category group when the listing has a single category", () => {
    const only = buildFacets([shop[0], shop[1]], EMPTY_FILTERS).map((x) => x.key);
    expect(only).not.toContain("category");
  });

  it("round-trips category in the URL and drops categories not in scope", () => {
    const r = parseFilters({ category: ["footwear", "ghosts"] }, shop);
    expect(r.category).toEqual(["footwear"]);
    expect(serializeFilters(f({ category: ["hoodies"] }))).toBe("category=hoodies");
  });
});

describe("contextual sizes", () => {
  it("lists only sizes that exist for the chosen category", () => {
    const shop = [
      p({ slug: "boot", category: "Footwear", categorySlug: "footwear", sizes: ["40", "41"] }),
      p({ slug: "hood", category: "Hoodies", categorySlug: "hoodies", sizes: ["S", "M"] }),
    ];
    const all = buildFacets(shop, EMPTY_FILTERS).find((x) => x.key === "size")!;
    expect(all.options.map((o) => o.value)).toEqual(["40", "41", "S", "M"]);
    const shoes = buildFacets(shop, f({ category: ["footwear"] })).find((x) => x.key === "size")!;
    expect(shoes.options.map((o) => o.value)).toEqual(["40", "41"]);
  });

  it("keeps a selected size visible even when it no longer matches", () => {
    const shop = [
      p({ slug: "boot", category: "Footwear", categorySlug: "footwear", sizes: ["40"] }),
      p({ slug: "hood", category: "Hoodies", categorySlug: "hoodies", sizes: ["S"] }),
    ];
    const facet = buildFacets(shop, f({ category: ["footwear"], size: ["S"] })).find((x) => x.key === "size")!;
    expect(facet.options.map((o) => o.value)).toEqual(["40", "S"]);
  });
});

describe("groupByCategory", () => {
  it("orders groups by sort order with the men/women catch-alls last", () => {
    const shop = [
      p({ slug: "misc", category: "Men", categorySlug: "men" }),
      p({ slug: "tee", category: "T-shirts", categorySlug: "t-shirts" }),
      p({ slug: "boot", category: "Footwear", categorySlug: "footwear" }),
      p({ slug: "boot2", category: "Footwear", categorySlug: "footwear" }),
    ];
    const groups = groupByCategory(shop, ["footwear", "t-shirts", "men"]);
    expect(groups.map((g) => g.slug)).toEqual(["footwear", "t-shirts", "men"]);
    expect(groups[0].products.map((x) => x.slug)).toEqual(["boot", "boot2"]);
  });
});
