"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const sideNavItemClass =
  "flex min-h-11 shrink-0 items-center whitespace-nowrap border-b border-transparent text-body text-muted transition-colors duration-[var(--duration-standard)] ease-[var(--ease-standard)] hover:text-ink aria-[current=page]:border-ink aria-[current=page]:text-ink md:border-b-0 md:border-l md:pl-4 md:aria-[current=page]:border-ink -mb-px md:mb-0 md:-ml-px";

export type SideNavLink = {
  label: string;
  href: string;
  /** Match nested routes too (e.g. /admin/orders/123 keeps Orders active). */
  prefix?: boolean;
};

/**
 * Section side menu: a vertical column from md up, a horizontally scrollable
 * row above the content below md. `children` render after the links (e.g. a
 * Sign out button styled with `sideNavItemClass`).
 */
export function SideNav({
  label,
  links,
  children,
}: {
  label: string;
  links: readonly SideNavLink[];
  children?: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="flex gap-6 overflow-x-auto border-b border-line/30 md:sticky md:top-[calc(var(--navbar-height)+2rem)] md:flex-col md:gap-1 md:self-start md:overflow-visible md:border-b-0 md:border-l md:border-line/30"
    >
      {links.map((link) => {
        const active = link.prefix
          ? pathname === link.href || pathname.startsWith(`${link.href}/`)
          : pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={sideNavItemClass}
          >
            {link.label}
          </Link>
        );
      })}
      {children}
    </nav>
  );
}
