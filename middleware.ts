// Protect /admin (except /admin/login) via the HMAC cookie.
// Note: middleware only checks cookie *presence/format* — full HMAC verify
// happens server-side on API routes (where we already gate every action).

import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "ms_admin";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && cookie.includes(".")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*"] };
