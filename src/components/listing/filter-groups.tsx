"use client";

import { useId, useState } from "react";

import type { Facet, FilterKey } from "@/lib/product-filters";

function PlusIcon() {
  return (
    <svg className="filter-plus" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M2 8h12" />
      <path className="filter-plus-v" d="M8 2v12" />
    </svg>
  );
}

function Group({
  facet,
  onToggle,
}: {
  facet: Facet;
  onToggle: (key: FilterKey, value: string) => void;
}) {
  const id = useId();
  const selectedCount = facet.options.filter((o) => o.selected).length;
  // Groups holding a selection start open so active filters are never hidden;
  // Category also starts open since it only appears on multi-category views.
  const [open, setOpen] = useState(selectedCount > 0 || facet.key === "category");

  return (
    <section className="filter-group">
      <h3>
        <button
          type="button"
          className="filter-trigger"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((v) => !v)}
        >
          <span>
            {facet.label}
            {selectedCount > 0 ? <span className="ml-2 text-muted">({selectedCount})</span> : null}
          </span>
          <PlusIcon />
        </button>
      </h3>
      <div id={`${id}-panel`} className="filter-panel" hidden={!open}>
        {facet.key === "size" ? (
          <div className="filter-sizes">
            {facet.options.map((o) => (
              <button
                key={o.value}
                type="button"
                className="filter-size"
                aria-pressed={o.selected}
                data-empty={o.count === 0 && !o.selected}
                onClick={() => onToggle(facet.key, o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <ul>
            {facet.options.map((o) => (
              <li key={o.value}>
                <label className="filter-option" data-empty={o.count === 0 && !o.selected}>
                  <input
                    type="checkbox"
                    checked={o.selected}
                    onChange={() => onToggle(facet.key, o.value)}
                    className="size-4 accent-[var(--ink)]"
                  />
                  <span>{o.label}</span>
                  <span className="filter-count">{o.count}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** The disclosure groups, shared by the desktop sidebar and the mobile drawer. */
export function FilterGroups({
  facets,
  onToggle,
}: {
  facets: Facet[];
  onToggle: (key: FilterKey, value: string) => void;
}) {
  return (
    <div>
      {facets.map((facet) => (
        <Group key={facet.key} facet={facet} onToggle={onToggle} />
      ))}
    </div>
  );
}
