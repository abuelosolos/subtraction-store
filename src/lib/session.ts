import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * The single place server code reads the signed-in user (Data Access Layer).
 * Reads request headers, so call it behind <Suspense> or from a route/action.
 * Returns null when signed out. Never trust a cookie's mere presence: the
 * proxy only does an optimistic redirect, this is the real check.
 */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/**
 * Page-level guard: the real session check (the proxy is only optimistic).
 * Redirects to login and back to `nextPath` afterwards.
 */
export async function requireUser(nextPath: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}
