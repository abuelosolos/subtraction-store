"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FilterGroups, SortGroup, SwitchRow } from "@/components/listing/filter-groups";
import { ProductListing, type Crumb } from "@/components/product-listing";
import { CloseIcon, FilterIcon } from "@/components/ui/icons";
import type { Product } from "@/lib/catalog";
import {
  EMPTY_FILTERS,
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
  initialFilters,
  baseCrumbs,
  subtitle,
  emptyMessage,
  tabs,
}: {
  id: string;
  products: Product[];
  /** Null on the gender views (Men's / Women's), which span every category. */
  categoryName: string | null;
  /** Gender views preselect a gender; an emptied gender filter is written as `gender=any`. */
  presetGender: "men" | "women" | null;
  initialFilters: Filters;
  baseCrumbs: Crumb[];
  subtitle: string;
  emptyMessage: string;
  /** Tab row under a department (Men / Women); rendered above the toolbar. */
  tabs?: React.ReactNode;
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

  const groups = (
    <FilterGroups facets={facets} onToggle={toggle}>
      <SortGroup value={filters.sort} onChange={(sort) => update({ ...filters, sort })} />
    </FilterGroups>
  );
  const count = `${visible.length} ${visible.length === 1 ? "piece" : "pieces"}`;

  return (
    <>
      <ProductListing
        id={id}
        title={title}
        subtitle={subtitle}
        crumbs={baseCrumbs.length > 0 ? [...baseCrumbs, { label: title }] : []}
        products={visible}
        emptyMessage={emptyMessage}
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
        layout="catalog"
        tabs={tabs}
        toolbar={
          <button
            type="button"
            className="inline-flex items-center gap-2 underline underline-offset-4"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
          >
            <FilterIcon size={16} />
            Filter{active > 0 ? ` (${active})` : ""}
          </button>
        }
      />

      <p role="status" className="sr-only">{`${title}: ${count}`}</p>

      <dialog
        ref={dialogRef}
        className="filter-drawer"
        aria-labelledby="filter-drawer-title"
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDrawerOpen(false);
        }}
      >
        <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close filters" className="filter-close">
          <CloseIcon size={20} />
        </button>
        <div className="flex items-baseline justify-between gap-4 pl-6 pr-[4.5rem] pt-10 pb-6">
          <h2 id="filter-drawer-title" className="filter-title">Filter and sort</h2>
          {active > 0 ? (
            <button type="button" onClick={clear} className="text-caption underline underline-offset-4">
              Clear all
            </button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          <div className="filter-switches">
            <SwitchRow label="In stock only" checked={filters.inStock} onChange={(inStock) => update({ ...filters, inStock })} />
            <SwitchRow label="Best sellers" checked={filters.bestSeller} onChange={(bestSeller) => update({ ...filters, bestSeller })} />
          </div>
          {groups}
        </div>
        <div className="px-6 py-4">
          <button type="button" onClick={() => setDrawerOpen(false)} className="btn btn-inverse w-full uppercase">
            Show {visible.length} {visible.length === 1 ? "item" : "items"}
          </button>
        </div>
      </dialog>
    </>
  );
}
