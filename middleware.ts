import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

const SUPERVISION_PREFIX = "/supervision";
const AUTH_COOKIE = "sv_token";

function isPublicPath(pathname: string) {
  return (
    // Public assets required to render login page
    pathname.startsWith(`${SUPERVISION_PREFIX}/_next/`) ||
    pathname === `${SUPERVISION_PREFIX}/favicon.ico` ||
    pathname === `${SUPERVISION_PREFIX}/robots.txt` ||
    pathname === `${SUPERVISION_PREFIX}/sitemap.xml` ||
    pathname === `${SUPERVISION_PREFIX}/login` ||
    pathname.startsWith("/api/supervision/auth/login")
  );
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith(SUPERVISION_PREFIX) ||
    pathname.startsWith("/api/supervision")
  );
}

function getJwtExpMs(token: string): number | null {
  try {
    const jwt = decodeJwt(token);
    if (!jwt.exp) return null;
    return jwt.exp * 1000;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = `${SUPERVISION_PREFIX}/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const expMs = getJwtExpMs(token);
  if (expMs && Date.now() >= expMs) {
    const url = req.nextUrl.clone();
    url.pathname = `${SUPERVISION_PREFIX}/login`;
    url.searchParams.set("reason", "expired");

    const res = NextResponse.redirect(url);
    res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/supervision/:path*", "/api/supervision/:path*"],
};

