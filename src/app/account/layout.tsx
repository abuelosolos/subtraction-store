import Link from "next/link";
import type { ReactNode } from "react";

import { AccountNav } from "@/components/account/account-nav";
import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";

/**
 * Shared frame for /account/*: navbar, breadcrumb, side menu and footer.
 * Static (no session read); each page does its own real session check.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteNavbar variant="solid" />
      <main className="surface-dark pt-[var(--navbar-height)]">
        <nav aria-label="Breadcrumb" className="container-page py-6 text-caption text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">Account</li>
          </ol>
        </nav>
        <div className="container-page grid gap-8 pb-[var(--section-y)] md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
