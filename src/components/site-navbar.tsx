"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

import { MobileMenu } from "@/components/mobile-menu";
import { NavDrawer } from "@/components/nav-drawer";
import { NavbarSearch } from "@/components/navbar-search";
import { MenuIcon, PlusIcon } from "@/components/ui/icons";
import { cartCount, useCart } from "@/lib/cart-store";

const actions = [
  {
    label: "Search",
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.500 4.500" />
      </>
    ),
  },
  {
    label: "Cart",
    href: "/cart",
    icon: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
  },
  {
    label: "Saved",
    href: "/saved",
    icon: (
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10Z" />
    ),
  },
];

/**
 * Transparent over the hero, solid dark once the hero has scrolled under it.
 * Styles live in src/styles/navbar.css. In "auto" mode the page needs an
 * element with id="hero"; use variant="solid" on pages without one.
 */
export function SiteNavbar({
  variant = "auto",
  withStrip = false,
  heroTone = "light",
  clearOnPhone = false,
}: {
  variant?: "auto" | "solid";
  withStrip?: boolean;
  /** "dark": the hero is a dark photo, so the bar is transparent with light ink over it. */
  heroTone?: "light" | "dark";
  /** Below md the bar is normally always solid; true lets it stay unfilled while in its hero state. */
  clearOnPhone?: boolean;
}) {
  const [scrolledPast, setScrolledPast] = useState(false);
  // True once the page has moved a little; the hero bar turns to glass.
  const [moved, setMoved] = useState(false);
  const cartItems = cartCount(useCart());

  useEffect(() => {
    if (variant !== "auto") return;
    // The bar's height comes from --navbar-height (56px phones, 61px from md).
    const bar = document.querySelector(".navbar")?.getBoundingClientRect().height ?? 61;
    let io: IntersectionObserver | null = null;
    const watch = (hero: HTMLElement) => {
      io = new IntersectionObserver(
        ([entry]) => setScrolledPast(!entry.isIntersecting),
        { rootMargin: `-${Math.round(bar)}px 0px 0px 0px` },
      );
      io.observe(hero);
    };
    const hero = document.getElementById("hero");
    if (hero) {
      watch(hero);
      return () => io?.disconnect();
    }
    // The hero may stream in after the bar mounts (pages that read searchParams): wait for it.
    const mo = new MutationObserver(() => {
      const found = document.getElementById("hero");
      if (found) {
        mo.disconnect();
        watch(found);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io?.disconnect();
    };
  }, [variant]);

  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => {
      setMoved(window.scrollY > 4);
      if (withStrip) {
        // The home strip is fixed behind the page. At the top the bar sits below it;
        // on the first scroll the bar slides up over it (CSS transition on `top`).
        const strip = document.querySelector(".category-strip")?.getBoundingClientRect().height ?? 0;
        root.style.setProperty("--navbar-top", window.scrollY > 0 ? "0px" : `${strip}px`);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.style.removeProperty("--navbar-top");
    };
  }, [withStrip]);

  const state = variant === "solid" || scrolledPast ? "solid" : "hero";

  return (
    <header className="navbar" data-navbar={state} data-scrolled={moved} data-strip={withStrip || undefined} data-hero-tone={heroTone === "dark" ? "dark" : undefined} data-phone-clear={clearOnPhone || undefined}>
      <div className="mx-auto flex w-full max-w-frame items-center justify-between">
        <Link href="/" className="font-brand text-brand font-bold">
          SUBTRACTION.
        </Link>
        <ul className="flex items-center gap-0 md:gap-5">
          {actions.map(({ label, icon, href }) => {
            const text = label;
            const count = label === "Cart" ? cartItems : 0;
            const accessibleLabel = count > 0 ? `${text}, ${count} ${count === 1 ? "item" : "items"}` : text;
            const content = (
              <>
                <span className="flex rounded-pill p-[5px] max-md:p-[6px]">
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
                <span className="hidden text-caption uppercase lg:inline">{text}</span>
                {count > 0 ? (
                  <span aria-hidden="true" className="text-caption font-medium">{count}</span>
                ) : null}
              </>
            );
            const className = "flex items-center gap-[3px] px-[5px]";
            // Phones keep Search, Cart and the menu button; the rest live in the drawer.
            return (
              <li key={label} className={label === "Search" || label === "Cart" ? undefined : "hidden md:block"}>
                {label === "Search" ? (
                  // usePathname is dynamic on routes like /orders/[id]; the fallback is
                  // the same icon, inert, until the component hydrates.
                  <Suspense
                    fallback={
                      <button type="button" aria-label="Search" disabled className={className}>
                        {content}
                      </button>
                    }
                  >
                    <NavbarSearch>{content}</NavbarSearch>
                  </Suspense>
                ) : (
                  <Link href={href ?? "#"} aria-label={accessibleLabel} className={className}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
          <li className="hidden md:block">
            {/* usePathname is dynamic on routes like /orders/[id]; the fallback is the same icon, inert. */}
            <Suspense
              fallback={
                <button type="button" aria-label="Open shop menu" disabled className="nav-drawer-trigger">
                  <PlusIcon size={21} />
                </button>
              }
            >
              <NavDrawer />
            </Suspense>
          </li>
          <li className="md:hidden">
            {/* usePathname is dynamic on routes like /orders/[id]; the fallback is the same icon, inert. */}
            <Suspense
              fallback={
                <button type="button" aria-label="Menu" disabled className="mobile-menu-trigger">
                  <MenuIcon size={21} />
                </button>
              }
            >
              <MobileMenu />
            </Suspense>
          </li>
        </ul>
      </div>
    </header>
  );
}
