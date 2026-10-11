import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

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

const ADMIN_ROLE = "admin";

/**
 * The signed-in user only if they are an admin, else null. Use at the top of
 * every admin server action and admin data function: actions are public POST
 * endpoints, so a page-level guard does not protect them. The role is read
 * from the database-backed session on every call.
 */
export async function getAdminUser() {
  const user = await getSessionUser();
  return user && user.role === ADMIN_ROLE ? user : null;
}

/**
 * Admin page guard. Signed out goes to login; signed in but not an admin gets
 * a 404 so the area's existence isn't revealed.
 */
export async function requireAdmin(nextPath: string) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (user.role !== ADMIN_ROLE) notFound();
  return user;
}
