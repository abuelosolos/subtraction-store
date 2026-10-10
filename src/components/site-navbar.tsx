"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = ["New arrivals", "Mens", "Womens"];

const actions = [
  {
    label: "Search",
    secondary: true,
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.500 4.500" />
      </>
    ),
  },
  {
    label: "Cart",
    icon: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
  },
  {
    label: "Saved",
    secondary: true,
    icon: (
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10Z" />
    ),
  },
  {
    label: "Profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.500 20a7.500 7.500 0 0 1 15 0" />
      </>
    ),
  },
];

/**
 * Transparent over the hero, solid dark once the hero has scrolled under it.
 * Styles live in src/styles/navbar.css. In "auto" mode the page needs an
 * element with id="hero"; use variant="solid" on pages without one.
 */
export function SiteNavbar({ variant = "auto" }: { variant?: "auto" | "solid" }) {
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const hero = variant === "auto" ? document.getElementById("hero") : null;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPast(!entry.isIntersecting),
      { rootMargin: "-61px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [variant]);

  const state = variant === "solid" || scrolledPast ? "solid" : "hero";

  return (
    <header className="navbar" data-navbar={state}>
      <div className="mx-auto flex w-full max-w-frame items-center justify-between">
        <div className="flex items-center gap-[60px]">
          <Link href="/" className="font-brand text-brand font-bold">
            SUBTRACTION.
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-[30px] md:flex">
            {links.map((label) => (
              <a key={label} href="#" className="navbar-link">
                {label}
              </a>
            ))}
          </nav>
        </div>
        <ul className="flex items-center gap-5">
          {actions.map(({ label, icon, secondary }) => (
            <li key={label} className={secondary ? "hidden sm:block" : undefined}>
              <a
                href="#"
                aria-label={label}
                className="flex items-center gap-[3px] px-[5px]"
              >
                <span className="flex rounded-pill p-[5px]">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.500"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {icon}
                  </svg>
                </span>
                <span className="hidden text-caption uppercase lg:inline">{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
