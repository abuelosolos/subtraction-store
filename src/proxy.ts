import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: checks that a session cookie exists, not that it is
// valid. Every checkout/account route must still call getSessionUser() itself,
// and every admin route/action must call requireAdmin()/getAdminUser().
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/checkout/:path*", "/account/:path*", "/admin/:path*", "/admin"],
};
