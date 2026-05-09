import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

export async function POST(req: Request) {
  if (isServerApiDebugEnabled()) {
    const hdr: Record<string, unknown> = {};
    req.headers.forEach((v, k) => {
      hdr[k] = v;
    });
    const u = new URL(req.url);
    logApiDebug("route:POST /api/supervision/auth/logout", {
      endpoint: u.pathname + u.search,
      method: "POST",
      requestHeaders: sanitizeHeaders(hdr),
      queryParams: sanitizeForLog(Object.fromEntries(u.searchParams.entries())),
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  const body = { status: "success" as const };
  if (isServerApiDebugEnabled()) {
    logApiDebug("route:POST /api/supervision/auth/logout (response)", {
      status: 200,
      responseData: sanitizeForLog(body),
    });
  }
  return NextResponse.json(body, { status: 200 });
}

