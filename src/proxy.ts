import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, adminEnv, verifySession } from "@/lib/admin-auth";

// Verifies the signed admin cookie before any /admin page renders. Admin
// server actions and API routes still call getAdminUser() themselves.
export function proxy(request: NextRequest) {
  const env = adminEnv();
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (env && verifySession(token, env.secret, env.passwordHash)) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/admin"],
};
