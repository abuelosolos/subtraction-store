"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { getSearchIndexAction } from "@/app/search/actions";
import { formatPrice } from "@/lib/catalog";
import { searchProducts, type SearchItem } from "@/lib/search";

type Index = { status: "idle" | "loading" | "error" } | { status: "ready"; items: SearchItem[] };

/**
 * Navbar search. The field grows to the left of the icon over a light fill;
 * results list below it once something is typed. Combobox pattern: the input
 * keeps focus and ArrowUp/Down move `aria-activedescendant`. Closes on Escape,
 * outside click, focus leaving, and navigation (open state is tied to the path).
 */
export function NavbarSearch({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [index, setIndex] = useState<Index>({ status: "idle" });

  const hide = () => {
    setOpenOn(null);
    setQuery("");
    setActive(-1);
  };

  // Load the product index the first time the field opens.
  useEffect(() => {
    if (!open || index.status !== "idle") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex({ status: "loading" });
    getSearchIndexAction()
      .then((items) => {
        if (!cancelled) setIndex({ status: "ready", items });
      })
      .catch(() => {
        if (!cancelled) setIndex({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [open, index.status]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) hide();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const typed = query.trim().length > 0;
  const results = useMemo(
    () => (index.status === "ready" ? searchProducts(index.items, query) : []),
    [index, query],
  );

  const optionId = (i: number) => `${baseId}-opt-${i}`;
  const showList = open && typed;

  const status =
    !typed || !open
      ? ""
      : index.status === "loading" || index.status === "idle"
        ? "Loading items"
        : index.status === "error"
          ? "Search is unavailable right now."
          : results.length === 0
            ? `No items match "${query.trim()}"`
            : `${results.length} ${results.length === 1 ? "item" : "items"} found`;

  return (
    <div
      ref={rootRef}
      className={open ? "navbar-search surface-light" : "navbar-search"}
      data-open={open}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          hide();
          triggerRef.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) hide();
      }}
    >
      <div className="navbar-search-field" inert={!open}>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search items"
          aria-expanded={showList && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && results[active] ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search items"
          maxLength={100}
          value={query}
          className="navbar-search-input"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && results.length > 0) {
              e.preventDefault();
              setActive((a) => (a + 1) % results.length);
            } else if (e.key === "ArrowUp" && results.length > 0) {
              e.preventDefault();
              setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
            } else if (e.key === "Enter" && active >= 0 && results[active]) {
              e.preventDefault();
              router.push(`/products/${results[active].slug}`);
              hide();
            }
          }}
        />
      </div>

      <button
        ref={triggerRef}
        type="button"
        aria-label="Search"
        aria-expanded={open}
        aria-controls={`${baseId}-panel`}
        className="navbar-search-trigger"
        onClick={() => (open ? hide() : setOpenOn(pathname))}
      >
        {children}
      </button>

      <div id={`${baseId}-panel`} className="navbar-search-panel" hidden={!showList}>
        <p role="status" className={results.length > 0 ? "sr-only" : "navbar-search-message"}>
          {status}
        </p>
        {results.length > 0 ? (
          <ul id={listId} role="listbox" aria-label="Search results" className="navbar-search-list">
            {results.map((item, i) => (
              <li key={item.slug} role="presentation">
                <Link
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  href={`/products/${item.slug}`}
                  className="navbar-search-item"
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={hide}
                >
                  <Image
                    src={item.image.src}
                    alt=""
                    width={item.image.width}
                    height={item.image.height}
                    sizes="40px"
                    className="navbar-search-thumb"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{item.name}</span>
                    <span className="block truncate text-caption text-muted">
                      {item.category}
                      {item.stock <= 0 ? " · Sold out" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-body">{formatPrice(item.priceCents, item.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
