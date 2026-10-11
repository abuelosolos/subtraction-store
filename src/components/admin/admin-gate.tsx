import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/session";

/**
 * The real admin check for a page. Reads the session (dynamic), so always
 * render inside <Suspense>. Signed out -> login; non-admin -> 404.
 */
export async function AdminGate({
  path,
  children,
}: {
  path: string;
  children: (admin: Awaited<ReturnType<typeof requireAdmin>>) => ReactNode | Promise<ReactNode>;
}) {
  const admin = await requireAdmin(path);
  return <>{await children(admin)}</>;
}
