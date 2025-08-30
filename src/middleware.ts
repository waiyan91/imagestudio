import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PASSWORD = process.env.NEXT_PUBLIC_GLOBAL_PASSWORD;

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const cookie = request.cookies.get("site_auth");

  // Allow access to login page and static files
  if (
    url.pathname === "/login" ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/manifest") ||
    url.pathname.startsWith("/icons") ||
    url.pathname.startsWith("/window")
  ) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to login
  if (!cookie || cookie.value !== PASSWORD) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"]
};
