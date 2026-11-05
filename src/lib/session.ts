import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE, OWNER_EMAIL, OWNER_ID, adminEnv, verifySession } from "@/lib/admin-auth";

export type AdminUser = { id: string; name: string; email: string; role: "admin" };

const OWNER: AdminUser = { id: OWNER_ID, name: "Owner", email: OWNER_EMAIL, role: "admin" };

/**
 * The admin, if the request carries a valid signed admin cookie, else null.
 * Use at the top of every admin server action and API route: actions are
 * public POST endpoints, so a page-level guard does not protect them. Fails
 * closed when ADMIN_* env vars are missing. Reads cookies, so call it behind
 * <Suspense> or from a route/action.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const env = adminEnv();
  if (!env) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySession(token, env.secret, env.passwordHash) ? OWNER : null;
}

/** Admin page guard: anyone without a valid session goes to login and back. */
export async function requireAdmin(nextPath: string) {
  const admin = await getAdminUser();
  if (!admin) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return admin;
}
