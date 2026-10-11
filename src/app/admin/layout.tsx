import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: "Admin | SUBTRACTION.",
  robots: { index: false, follow: false },
};

/**
 * Shared frame for /admin/*. Static (no session read, per cacheComponents);
 * every page wraps its content in <AdminGate> which does the real role check.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="navbar" data-navbar="solid">
        <div className="mx-auto flex w-full max-w-frame items-center justify-between">
          <Link href="/admin" className="font-brand text-brand font-bold">
            SUBTRACTION. <span className="text-caption font-medium uppercase text-muted">Admin</span>
          </Link>
          <Link href="/" className="navbar-link">Back to shop</Link>
        </div>
      </header>
      <main className="surface-dark min-h-screen pt-[var(--navbar-height)]">
        <div className="container-page grid gap-8 py-8 pb-[var(--section-y)] md:grid-cols-[13rem_minmax(0,1fr)] md:gap-12">
          {/* usePathname is dynamic on /admin/orders/[id]; needs a boundary. */}
          <Suspense fallback={<div className="min-h-11 md:min-h-0" aria-hidden="true" />}>
            <AdminNav />
          </Suspense>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </>
  );
}
