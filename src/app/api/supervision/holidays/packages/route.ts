import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import {
  buildVivapiAuthorizedHeaders,
  fetchVivapiAppBearer,
} from "@/services/vivapi/app-auth";
import { createHolidayPackageSchema } from "@/types/holiday-package-create";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

function shouldLogHolidayPackage(): boolean {
  return isServerApiDebugEnabled() || process.env.NODE_ENV === "development";
}

function incomingRequestMeta(req: Request, requestBody?: unknown) {
  const incoming = new URL(req.url);
  const hdr: Record<string, unknown> = {};
  req.headers.forEach((v, k) => {
    hdr[k] = v;
  });
  return {
    endpoint: incoming.pathname + incoming.search,
    method: req.method,
    queryParams: sanitizeForLog(Object.fromEntries(incoming.searchParams.entries())),
    requestHeaders: sanitizeHeaders(hdr),
    ...(requestBody !== undefined ? { requestBody: sanitizeForLog(requestBody) } : {}),
  };
}

export async function POST(req: Request) {
  const debug = shouldLogHolidayPackage();

  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    const body = { message: "Unauthenticated" };
    if (debug) {
      logApiDebug("route:POST /api/supervision/holidays/packages (incoming)", {
        ...incomingRequestMeta(req),
        note: "Rejected — no sv_token cookie",
      });
      logApiDebug("route:POST /api/supervision/holidays/packages (response)", {
        status: 401,
        responseData: body,
      });
    }
    return NextResponse.json(body, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    const body = { message: "Invalid JSON body" };
    if (debug) {
      logApiDebug("route:POST /api/supervision/holidays/packages (incoming)", {
        ...incomingRequestMeta(req),
        note: "Rejected — invalid JSON",
      });
      logApiDebug("route:POST /api/supervision/holidays/packages (response)", {
        status: 400,
        responseData: body,
      });
    }
    return NextResponse.json(body, { status: 400 });
  }

  if (debug) {
    logApiDebug("route:POST /api/supervision/holidays/packages (incoming)", {
      ...incomingRequestMeta(req, json),
    });
  }

  const parsed = createHolidayPackageSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid holiday package payload";
    const body = { message: msg, issues: parsed.error.flatten() };
    if (debug) {
      logApiDebug("route:POST /api/supervision/holidays/packages (response)", {
        ...incomingRequestMeta(req),
        status: 400,
        responseData: sanitizeForLog(body),
        validationFailed: true,
      });
    }
    return NextResponse.json(body, { status: 400 });
  }

  const env = getServerEnv();
  const base = env.HOLIDAYS_API_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/api/v1/holidays/admin/packages`;

  try {
    const bearer = await fetchVivapiAppBearer(env);
    const headers = buildVivapiAuthorizedHeaders(env, bearer);

    if (debug) {
      logApiDebug("route:POST holidays packages (upstream request)", {
        endpoint: upstreamUrl,
        method: "POST",
        queryParams: null,
        requestHeaders: sanitizeHeaders(headers),
        headerPresence: {
          "X-API-KEY": true,
          Authorization: true,
        },
        requestBody: sanitizeForLog(parsed.data),
      });
    }

    const res = await axios.post(upstreamUrl, parsed.data, {
      headers,
      timeout: 60_000,
      validateStatus: () => true,
    });

    if (debug) {
      logApiDebug("route:POST holidays packages (upstream response)", {
        endpoint: upstreamUrl,
        status: res.status,
        statusText: res.statusText,
        responseHeaders: sanitizeHeaders(
          res.headers as unknown as Record<string, unknown>
        ),
        responseData: sanitizeForLog(res.data),
      });
    }

    if (res.status < 200 || res.status >= 300) {
      const msg =
        (res.data as { message?: string })?.message ||
        (res.data as { error?: string })?.error ||
        `Create holiday package failed (${res.status})`;
      const body = { message: msg, data: res.data };
      if (debug) {
        logApiDebug("route:POST /api/supervision/holidays/packages (response)", {
          ...incomingRequestMeta(req),
          status: res.status >= 400 ? res.status : 502,
          responseData: sanitizeForLog(body),
        });
      }
      return NextResponse.json(body, {
        status: res.status >= 400 ? res.status : 502,
      });
    }

    const body = { status: "success" as const, data: res.data };
    if (debug) {
      logApiDebug("route:POST /api/supervision/holidays/packages (response)", {
        ...incomingRequestMeta(req),
        status: 200,
        responseData: sanitizeForLog(body),
      });
    }

    return NextResponse.json(body, { status: 200 });
  } catch (err: unknown) {
    const ax = err as { message?: string; response?: { data?: unknown; status?: number } };
    if (debug) {
      logApiDebug("route:POST holidays packages (upstream error)", {
        endpoint: upstreamUrl,
        errorMessage: ax?.message,
        status: ax?.response?.status,
        responseData: sanitizeForLog(ax?.response?.data),
      });
      logApiDebug("route:POST /api/supervision/holidays/packages (response)", {
        ...incomingRequestMeta(req),
        status: 502,
        responseData: sanitizeForLog({
          message: ax?.message || "Failed to create holiday package",
        }),
      });
    }
    return NextResponse.json(
      { message: ax?.message || "Failed to create holiday package" },
      { status: 502 }
    );
  }
}
