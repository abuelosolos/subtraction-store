"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CategoryRails, type CategoryGroup } from "@/components/listing/category-rails";
import { FilterGroups } from "@/components/listing/filter-groups";
import { ProductListing, type Crumb } from "@/components/product-listing";
import type { Product } from "@/lib/catalog";
import {
  EMPTY_FILTERS,
  FILTER_KEYS,
  activeFilterCount,
  applyFilters,
  buildFacets,
  listingTitle,
  serializeFilters,
  type FilterKey,
  type Filters,
} from "@/lib/product-filters";

/**
 * Category / gender listing with the filter sidebar. The server passes every
 * product in scope; filtering is instant on the client and mirrored in the URL
 * (history.replaceState) so a filtered page can be shared. The heading follows
 * the selected gender: "Men's Footwear" becomes "Footwear" when Women is added.
 */
export function FilterableListing({
  id,
  products,
  categoryName,
  presetGender,
  categoryOrder,
  initialFilters,
  baseCrumbs,
  subtitle,
  emptyMessage,
}: {
  id: string;
  products: Product[];
  /** Null on the gender views (Men's / Women's), which span every category. */
  categoryName: string | null;
  /** Gender views preselect a gender; an emptied gender filter is written as `gender=any`. */
  presetGender: "men" | "women" | null;
  /** Category slugs in display order (sort_order); sets the section order on gender views. */
  categoryOrder: string[];
  initialFilters: Filters;
  baseCrumbs: Crumb[];
  subtitle: string;
  emptyMessage: string;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const visible = useMemo(() => applyFilters(products, filters), [products, filters]);
  const facets = useMemo(() => buildFacets(products, filters), [products, filters]);
  // On gender views, choosing exactly one category names the page after it.
  const selectedCategoryName =
    categoryName === null && filters.category.length === 1
      ? (products.find((p) => p.categorySlug === filters.category[0])?.category ?? null)
      : categoryName;
  const title = listingTitle(selectedCategoryName, filters.gender);

  // Gender views start as category sections; any other filter switches to the grid.
  const sectionsMode =
    presetGender !== null &&
    FILTER_KEYS.every((key) => key === "gender" || filters[key].length === 0);
  const sections: CategoryGroup[] = useMemo(() => {
    if (!sectionsMode) return [];
    const bySlug = new Map<string, CategoryGroup>();
    for (const p of visible) {
      const g = bySlug.get(p.categorySlug) ?? { slug: p.categorySlug, name: p.category, products: [] };
      g.products.push(p);
      bySlug.set(p.categorySlug, g);
    }
    // The men/women catch-all categories go last, the rest follow sort_order.
    const rank = (slug: string) => {
      const i = categoryOrder.indexOf(slug);
      return (slug === "men" || slug === "women" ? 1000 : 0) + (i === -1 ? 500 : i);
    };
    return [...bySlug.values()].sort((a, b) => rank(a.slug) - rank(b.slug));
  }, [sectionsMode, visible, categoryOrder]);
  // The gender a gender view starts with is not "a filter the user applied".
  const presetOnly =
    presetGender !== null && filters.gender.length === 1 && filters.gender[0] === presetGender;
  const active = activeFilterCount(filters) - (presetOnly ? 1 : 0);

  function update(next: Filters) {
    setFilters(next);
    let qs = serializeFilters(next);
    if (presetGender && next.gender.length === 0) qs = qs ? `gender=any&${qs}` : "gender=any";
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }

  function toggle(key: FilterKey, value: string) {
    const current = filters[key];
    update({
      ...filters,
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    });
  }

  const clear = () => update({ ...EMPTY_FILTERS });

  // Drive the native dialog from state; keep state in sync when Escape closes it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    if (!drawerOpen && dialog.open) dialog.close();
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const groups = <FilterGroups facets={facets} onToggle={toggle} />;
  const count = `${visible.length} ${visible.length === 1 ? "piece" : "pieces"}`;

  return (
    <>
      <ProductListing
        id={id}
        title={title}
        subtitle={subtitle}
        crumbs={[...baseCrumbs, { label: title }]}
        products={visible}
        emptyMessage={emptyMessage}
        content={
          sectionsMode && sections.length > 0 ? (
            <CategoryRails groups={sections} gender={filters.gender.length === 1 ? (filters.gender[0] as "men" | "women") : null} />
          ) : undefined
        }
        empty={
          products.length > 0 && active > 0 ? (
            <div className="py-16 text-body">
              <p className="text-muted">No items match these filters.</p>
              <button type="button" onClick={clear} className="mt-4 underline underline-offset-4">
                Clear all filters
              </button>
            </div>
          ) : undefined
        }
        toolbar={
          <button
            type="button"
            className="btn btn-outline md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
          >
            Filter{active > 0 ? ` (${active})` : ""}
          </button>
        }
        sidebar={
          <div className="sticky top-[calc(var(--navbar-height)+2rem)]">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-body font-semibold">Filter</h2>
              {active > 0 ? (
                <button type="button" onClick={clear} className="text-caption underline underline-offset-4">
                  Clear all
                </button>
              ) : null}
            </div>
            {groups}
          </div>
        }
      />

      <p role="status" className="sr-only">{`${title}: ${count}`}</p>

      <dialog
        ref={dialogRef}
        className="filter-drawer"
        aria-label="Filter"
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDrawerOpen(false);
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-body font-semibold">Filter</h2>
          <button type="button" onClick={() => setDrawerOpen(false)} className="text-caption underline underline-offset-4">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          {groups}
        </div>
        <div className="flex gap-3 border-t border-line/30 px-6 py-4">
          {active > 0 ? (
            <button type="button" onClick={clear} className="btn btn-outline">Clear all</button>
          ) : null}
          <button type="button" onClick={() => setDrawerOpen(false)} className="btn btn-inverse flex-1">
            Show {count}
          </button>
        </div>
      </dialog>
    </>
  );
}
