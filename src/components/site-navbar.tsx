"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

import { NavbarProfileMenu } from "@/components/navbar-profile-menu";
import { NavbarSearch } from "@/components/navbar-search";
import { authClient } from "@/lib/auth-client";
import { cartCount, useCart } from "@/lib/cart-store";

const links = [
  { label: "New arrivals", href: "/new-arrivals" },
  { label: "Mens", href: "/categories/men" },
  { label: "Womens", href: "/categories/women" },
];

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
    secondary: true,
    icon: (
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.600-7 10-7 10Z" />
    ),
  },
  {
    label: "Profile",
    href: "/login",
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
  // True once the page has moved a little; the hero bar turns to glass.
  const [moved, setMoved] = useState(false);
  // Client-side session read, so the navbar never blocks the static shell.
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(session?.user);
  const cartItems = cartCount(useCart());

  useEffect(() => {
    const hero = variant === "auto" ? document.getElementById("hero") : null;
    if (!hero) return;
    // The bar's height comes from --navbar-height (56px phones, 61px from md).
    const bar = document.querySelector(".navbar")?.getBoundingClientRect().height ?? 61;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPast(!entry.isIntersecting),
      { rootMargin: `-${Math.round(bar)}px 0px 0px 0px` },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [variant]);

  useEffect(() => {
    const onScroll = () => setMoved(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const state = variant === "solid" || scrolledPast ? "solid" : "hero";

  return (
    <header className="navbar" data-navbar={state} data-scrolled={moved}>
      <div className="mx-auto flex w-full max-w-frame items-center justify-between">
        <div className="flex items-center gap-[60px]">
          <Link href="/" className="font-brand text-brand font-bold">
            SUBTRACTION.
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-[30px] md:flex">
            {links.map(({ label, href }) => (
              <Link key={label} href={href} className="navbar-link">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <ul className="flex items-center gap-5">
          {actions.map(({ label, icon, secondary, href }) => {
            // Profile: sign-in link when signed out, account menu when signed in.
            const accountMenu = label === "Profile" && signedIn && session?.user;
            const text = accountMenu ? "Account" : label;
            const count = label === "Cart" ? cartItems : 0;
            const accessibleLabel = count > 0 ? `${text}, ${count} ${count === 1 ? "item" : "items"}` : text;
            const content = (
              <>
                <span className="flex rounded-pill p-[5px] max-md:p-[11.5px]">
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
            return (
              <li key={label} className={secondary ? "hidden sm:block" : undefined}>
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
                ) : accountMenu ? (
                  <NavbarProfileMenu name={session.user.name} email={session.user.email} isAdmin={session.user.role === "admin"}>
                    {content}
                  </NavbarProfileMenu>
                ) : (
                  <Link href={href ?? "#"} aria-label={accessibleLabel} className={className}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
