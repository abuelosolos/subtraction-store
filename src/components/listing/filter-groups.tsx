"use client";

import { useId, useState } from "react";

import { ChevronDownIcon } from "@/components/ui/icons";
import { SORT_OPTIONS, type Facet, type FilterKey, type SortKey } from "@/lib/product-filters";

/** An on/off row (In stock only, Best sellers). */
export function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="filter-switch"
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <span className="filter-switch-track" aria-hidden="true">
        <span className="filter-switch-knob" />
      </span>
    </button>
  );
}

/** Sort By: a disclosure group like the facets, holding a radio list. */
export function SortGroup({ value, onChange }: { value: SortKey; onChange: (next: SortKey) => void }) {
  const id = useId();
  const [open, setOpen] = useState(value !== "");
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
          <span>Sort by</span>
          <ChevronDownIcon className="filter-chevron" size={16} />
        </button>
      </h3>
      <div id={`${id}-panel`} className="filter-panel" hidden={!open}>
        <ul>
          {SORT_OPTIONS.map((o) => (
            <li key={o.value}>
              <label className="filter-option">
                <input
                  type="radio"
                  name={`${id}-sort`}
                  checked={value === o.value}
                  onChange={() => onChange(o.value)}
                  className="size-4 accent-[var(--ink)]"
                />
                <span>{o.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
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
          <ChevronDownIcon className="filter-chevron" size={16} />
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
  children,
}: {
  facets: Facet[];
  onToggle: (key: FilterKey, value: string) => void;
  /** Extra groups after the facets (Sort by). */
  children?: React.ReactNode;
}) {
  return (
    <div>
      {facets.map((facet) => (
        <Group key={facet.key} facet={facet} onToggle={onToggle} />
      ))}
      {children}
    </div>
  );
}
