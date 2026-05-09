import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeDecodeJwt } from "@/lib/auth";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

export async function GET(req: Request) {
  if (isServerApiDebugEnabled()) {
    const hdr: Record<string, unknown> = {};
    req.headers.forEach((v, k) => {
      hdr[k] = v;
    });
    const u = new URL(req.url);
    logApiDebug("route:GET /api/supervision/auth/me", {
      endpoint: u.pathname + u.search,
      method: "GET",
      requestHeaders: sanitizeHeaders(hdr),
      queryParams: sanitizeForLog(Object.fromEntries(u.searchParams.entries())),
    });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    const err = { message: "Unauthenticated" };
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:GET /api/supervision/auth/me (response)", {
        status: 401,
        responseData: sanitizeForLog(err),
      });
    }
    return NextResponse.json(err, { status: 401 });
  }

  const decoded = safeDecodeJwt(token);
  const body = { status: "success" as const, token: { decoded } };
  if (isServerApiDebugEnabled()) {
    logApiDebug("route:GET /api/supervision/auth/me (response)", {
      status: 200,
      responseData: sanitizeForLog(body),
      note: "Raw JWT cookie value is never logged.",
    });
  }
  return NextResponse.json(body, { status: 200 });
}

