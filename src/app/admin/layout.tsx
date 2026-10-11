import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";

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
    // usePathname is dynamic on /admin/orders/[id]; needs a boundary.
    <Suspense fallback={<div className="admin-shell" aria-hidden="true" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
