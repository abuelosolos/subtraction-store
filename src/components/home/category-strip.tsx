"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

const INTERVAL_MS = 5000;

type StripItem = { label: string; href: string };

/**
 * Thin strip above the home navbar: one "Shop <category>" link at a time,
 * sliding vertically to the next every 5s, with chevrons for manual
 * previous / next. Styles in src/styles/navbar.css (.category-strip).
 */
export function CategoryStrip({ items }: { items: StripItem[] }) {
  const count = items.length;
  const [index, setIndex] = useState(0);
  // Bumped by manual clicks so the 5s timer restarts after each one.
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused, tick]);

  if (count === 0) return null;

  const go = (step: number) => {
    setIndex((i) => (i + step + count) % count);
    setTick((t) => t + 1);
  };

  // Position of item i relative to the current one, wrapped to the shortest
  // direction: 0 = visible, 1 = waiting below, -1 = gone above.
  const offsetOf = (i: number) => {
    let o = (((i - index) % count) + count) % count;
    if (o > count / 2) o -= count;
    return o;
  };

  return (
    <section
      aria-label="Shop categories"
      className="category-strip"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="category-strip-inner">
        {count > 1 ? (
          <button type="button" className="category-strip-arrow" aria-label="Previous category" onClick={() => go(-1)}>
            <ChevronLeftIcon size={16} />
          </button>
        ) : (
          <span />
        )}
        <div className="category-strip-viewport">
          {items.map(({ label, href }, i) => {
            const offset = offsetOf(i);
            const active = offset === 0;
            return (
              <div
                key={href}
                className="category-strip-item"
                aria-hidden={!active}
                style={{
                  transform: `translateY(${Math.max(-1, Math.min(1, offset)) * 100}%)`,
                  opacity: active ? 1 : 0,
                  pointerEvents: active ? "auto" : "none",
                }}
              >
                Shop&nbsp;
                <Link href={href} tabIndex={active ? 0 : -1} className="category-strip-link">
                  {label}
                </Link>
              </div>
            );
          })}
        </div>
        {count > 1 ? (
          <button type="button" className="category-strip-arrow" aria-label="Next category" onClick={() => go(1)}>
            <ChevronRightIcon size={16} />
          </button>
        ) : (
          <span />
        )}
      </div>
    </section>
  );
}
