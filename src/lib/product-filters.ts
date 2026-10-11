// Listing filters (size, gender, colour, collection). Pure and DB-free: the
// page passes every product in scope, the client filters instantly and keeps
// the selection in the URL as repeated params (?gender=men&size=M&size=L).
import type { Product } from "@/lib/catalog";

export const FILTER_KEYS = ["gender", "category", "size", "color", "collection"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type Filters = Record<FilterKey, string[]>;

export const FILTER_LABELS: Record<FilterKey, string> = {
  category: "Category",
  size: "Size",
  gender: "Gender",
  color: "Colour",
  collection: "Collection",
};

/** Display order of the groups in the sidebar. */
export const FILTER_ORDER: readonly FilterKey[] = ["category", "size", "gender", "color", "collection"];

export const EMPTY_FILTERS: Filters = { gender: [], category: [], size: [], color: [], collection: [] };

const GENDER_LABEL: Record<string, string> = { men: "Men", women: "Women" };
const MAX_VALUES = 20;
const MAX_VALUE_LENGTH = 40;

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

const valuesOf = (src: ParamSource, key: string): string[] => {
  if (src instanceof URLSearchParams) return src.getAll(key);
  const v = src[key];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
};

/**
 * Read filters from search params. Values are trimmed, de-duplicated and
 * bounded; gender is limited to men/women. Anything not offered by the current
 * listing is dropped when `scope` is given.
 */
export function parseFilters(src: ParamSource, scope?: readonly Product[]): Filters {
  const out: Filters = { gender: [], category: [], size: [], color: [], collection: [] };
  for (const key of FILTER_KEYS) {
    const seen = new Set<string>();
    for (const raw of valuesOf(src, key)) {
      const v = raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
      if (!v || v.length > MAX_VALUE_LENGTH || seen.has(v)) continue;
      if (key === "gender" && v !== "men" && v !== "women") continue;
      seen.add(v);
      if (seen.size >= MAX_VALUES) break;
    }
    out[key] = [...seen];
  }
  if (!scope) return out;

  const offered = optionValues(scope);
  for (const key of ["category", "size", "color", "collection"] as const) {
    out[key] = out[key].filter((v) => offered[key].includes(v));
  }
  return out;
}

export function serializeFilters(filters: Filters): string {
  const qs = new URLSearchParams();
  for (const key of FILTER_KEYS) for (const v of filters[key]) qs.append(key, v);
  return qs.toString();
}

export const activeFilterCount = (f: Filters) =>
  FILTER_KEYS.reduce((n, key) => n + f[key].length, 0);

const matches = (p: Product, key: FilterKey, selected: string[]): boolean => {
  if (selected.length === 0) return true;
  switch (key) {
    case "gender":
      // A men's filter also shows unisex pieces, and vice versa.
      return selected.some((g) => p.gender === g || p.gender === "unisex");
    case "category":
      return selected.includes(p.categorySlug);
    case "size":
      return selected.some((s) => p.sizes.includes(s));
    case "color":
      return selected.includes(p.color);
    case "collection":
      return p.collection !== undefined && selected.includes(p.collection);
  }
};

const matchesAll = (p: Product, f: Filters, except?: FilterKey) =>
  FILTER_KEYS.every((key) => key === except || matches(p, key, f[key]));

export function applyFilters(products: readonly Product[], filters: Filters): Product[] {
  return products.filter((p) => matchesAll(p, filters));
}

const CLOTHING_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "xxl", "2xl", "3xl", "4xl"];

/** Numeric sizes ascending, then S..3XL, then anything else alphabetically. */
export function compareSizes(a: string, b: string): number {
  const isNumber = (s: string) => /^\d+(\.\d+)?$/.test(s);
  const na = Number.parseFloat(a);
  const nb = Number.parseFloat(b);
  const aNum = isNumber(a);
  const bNum = isNumber(b);
  if (aNum && bNum) return na - nb;
  if (aNum !== bNum) return aNum ? -1 : 1;
  const ia = CLOTHING_ORDER.indexOf(a.toLowerCase());
  const ib = CLOTHING_ORDER.indexOf(b.toLowerCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

/** Every option value present in the scope, per facet (unfiltered). */
function optionValues(products: readonly Product[]): Record<FilterKey, string[]> {
  const size = new Set<string>();
  const color = new Set<string>();
  const collection = new Set<string>();
  const categories = new Map<string, string>();
  for (const p of products) {
    p.sizes.forEach((s) => size.add(s));
    if (p.color) color.add(p.color);
    if (p.collection) collection.add(p.collection);
    categories.set(p.categorySlug, p.category);
  }
  return {
    gender: ["men", "women"],
    // Slugs, ordered by display name.
    category: [...categories.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([slug]) => slug),
    size: [...size].sort(compareSizes),
    color: [...color].sort((a, b) => a.localeCompare(b)),
    collection: [...collection].sort((a, b) => a.localeCompare(b)),
  };
}

export type FacetOption = { value: string; label: string; count: number; selected: boolean };
export type Facet = { key: FilterKey; label: string; options: FacetOption[] };

/**
 * Sidebar groups. Each option's count applies every OTHER active filter, so
 * the numbers answer "how many would I get if I ticked this?". Groups with no
 * options are omitted (e.g. Collection before any are set).
 */
export function buildFacets(products: readonly Product[], filters: Filters): Facet[] {
  const all = optionValues(products);
  const categoryNames = new Map(products.map((p) => [p.categorySlug, p.category]));
  const facets: Facet[] = [];

  for (const key of FILTER_ORDER) {
    const candidates = products.filter((p) => matchesAll(p, filters, key));
    let options: FacetOption[] = all[key].map((value) => ({
      value,
      label:
        key === "gender"
          ? (GENDER_LABEL[value] ?? value)
          : key === "category"
            ? (categoryNames.get(value) ?? value)
            : value,
      count: candidates.filter((p) => matches(p, key, [value])).length,
      selected: filters[key].includes(value),
    }));
    // Sizes follow context: pick Footwear and only shoe sizes remain; with no
    // category chosen, every size on offer is listed.
    if (key === "size") options = options.filter((o) => o.count > 0 || o.selected);
    // A lone category (a category page) is not worth a group.
    const min = key === "category" ? 2 : 1;
    if (options.length >= min) facets.push({ key, label: FILTER_LABELS[key], options });
  }
  return facets;
}

/**
 * Page heading. With a category: "Footwear", or "Men's Footwear" when exactly
 * one gender is selected (both genders, or none, drop the prefix). Without a
 * category (gender views): "Men's" / "Women's", else "All products".
 */
export function listingTitle(categoryName: string | null, genders: readonly string[]): string {
  const selected = genders.filter((g) => g === "men" || g === "women");
  const prefix = selected.length === 1 ? (selected[0] === "men" ? "Men's" : "Women's") : null;
  if (categoryName) return prefix ? `${prefix} ${categoryName}` : categoryName;
  return prefix ?? "All products";
}
