"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatPrice } from "@/lib/catalog";
import { searchProducts, type SearchItem } from "@/lib/search";

export type SearchIndex = { status: "idle" | "loading" | "error" } | { status: "ready"; items: SearchItem[] };

const TRENDING_COUNT = 4;
const SUGGESTED_COUNT = 8;

function Card({ item, onNavigate, className, eager = false }: { item: SearchItem; onNavigate: () => void; className?: string; eager?: boolean }) {
  return (
    <Link href={`/products/${item.slug}`} onClick={onNavigate} className={`mobile-search-card ${className ?? ""}`}>
      <span className="relative block aspect-[4/5] overflow-hidden bg-ink/[0.03]">
        <Image
          src={item.image.src}
          alt=""
          fill
          sizes="(min-width: 640px) 30vw, 50vw"
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </span>
      <span className="mt-2 block truncate text-body">{item.name}</span>
      <span className="block text-caption text-muted">
        {item.stock <= 0 ? "Sold out" : formatPrice(item.priceCents, item.currency)}
      </span>
    </Link>
  );
}

/**
 * Phone search: a full-screen white sheet that slides up from the bottom, with the
 * field expanding out of the search icon, then trending links and suggested items
 * (or the results once something is typed). Native modal <dialog> for focus trap
 * and Escape. md and up uses the inline navbar search instead.
 */
export function MobileSearch({
  open,
  onClose,
  index,
}: {
  open: boolean;
  onClose: () => void;
  index: SearchIndex;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // After the slide, the field has expanded: put the cursor in it.
      const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
      document.body.style.overflow = "hidden";
      return () => {
        window.clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = "";
  }, [open]);

  const close = () => {
    setQuery("");
    onClose();
  };

  const items = useMemo(() => (index.status === "ready" ? index.items : []), [index]);
  const typed = query.trim().length > 0;
  const results = useMemo(() => searchProducts(items, query), [items, query]);
  const trending = useMemo(() => {
    const seen = new Map<string, string>();
    for (const i of items) if (!seen.has(i.categorySlug)) seen.set(i.categorySlug, i.category);
    return [...seen.entries()].slice(0, TRENDING_COUNT);
  }, [items]);

  const message =
    index.status === "error"
      ? "Search is unavailable right now."
      : index.status !== "ready"
        ? "Loading items"
        : typed && results.length === 0
          ? `No items match "${query.trim()}"`
          : "";

  return (
    <dialog
      ref={dialogRef}
      className="mobile-search"
      aria-label="Search"
      onClose={() => {
        setQuery("");
        onClose();
      }}
    >
      <div className="mobile-search-head">
        <Link href="/" onClick={close} className="font-brand text-brand font-bold">
          SUBTRACTION.
        </Link>
        <button type="button" onClick={close} className="text-caption underline underline-offset-4">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-[var(--gutter)] pb-10">
        <div className="mobile-search-field">
          <input
            ref={inputRef}
            type="search"
            aria-label="Search items"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search items"
            maxLength={100}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mobile-search-input"
          />
        </div>

        <p role="status" className={message ? "mt-6 text-body text-muted" : "sr-only"}>
          {message || (typed ? `${results.length} ${results.length === 1 ? "item" : "items"} found` : "")}
        </p>

        {typed ? (
          results.length > 0 ? (
            <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6" aria-label="Search results">
              {results.map((item) => (
                <li key={item.slug}>
                  <Card item={item} onNavigate={close} />
                </li>
              ))}
            </ul>
          ) : null
        ) : (
          <>
            {trending.length > 0 ? (
              <section aria-labelledby="trending-heading" className="mt-8">
                <h2 id="trending-heading" className="text-caption text-muted">Trending searches</h2>
                <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                  {trending.map(([slug, name]) => (
                    <li key={slug}>
                      <Link href={`/categories/${slug}`} onClick={close} className="text-caption underline underline-offset-4">
                        {name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {items.length > 0 ? (
              <section aria-labelledby="suggested-heading" className="mt-10">
                <h2 id="suggested-heading" className="text-caption font-semibold uppercase">Suggested</h2>
                <ul className="mobile-search-rail mt-4" aria-label="Suggested items, scroll horizontally" tabIndex={0}>
                  {items.slice(0, SUGGESTED_COUNT).map((item) => (
                    <li key={item.slug} className="w-[46%] shrink-0 snap-start">
                      <Card item={item} onNavigate={close} eager />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </dialog>
  );
}
