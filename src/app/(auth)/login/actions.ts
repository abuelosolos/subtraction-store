"use server";

import { sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  ADMIN_COOKIE,
  OWNER_EMAIL,
  OWNER_ID,
  SESSION_TTL_SECONDS,
  adminEnv,
  createLimiter,
  signSession,
  verifyPassword,
} from "@/lib/admin-auth";
import { safeNextPath } from "@/lib/safe-next";

export type LoginState = { error: string | null };

const limiter = createLimiter();

async function clientId() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Password-only admin login. On success sets the signed session cookie. */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const env = adminEnv();
  if (!env) return { error: "Admin login is not configured." };

  const id = await clientId();
  if (limiter.blocked(id)) return { error: "Too many attempts. Try again in a few minutes." };

  const password = String(formData.get("password") ?? "");
  if (!password || password.length > 256 || !verifyPassword(password, env.passwordHash)) {
    limiter.fail(id);
    return { error: "Incorrect password." };
  }
  limiter.reset(id);

  // Audit/stock rows reference user.id, so the single admin needs a real row.
  // It has no credential (account) row, so it cannot sign in any other way.
  try {
    await db.execute(sql`
      insert into "user" (id, name, email, email_verified, role)
      values (${OWNER_ID}, 'Owner', ${OWNER_EMAIL}, true, 'admin')
      on conflict (id) do update set role = 'admin'
    `);
  } catch {
    return { error: "Could not reach the database. Try again." };
  }

  (await cookies()).set(ADMIN_COOKIE, signSession(env.secret, env.passwordHash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(safeNextPath(String(formData.get("next") ?? ""), "/admin"));
}

export async function logoutAction() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/login");
}
