import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import {
  buildVivapiAuthorizedHeaders,
  fetchVivapiAppBearer,
} from "@/services/vivapi/app-auth";
import { extractRecordArray } from "@/lib/api-response-array";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

function shouldLogB2cEnquiry(): boolean {
  return (
    isServerApiDebugEnabled() || process.env.NODE_ENV === "development"
  );
}

function incomingRequestMeta(req: Request) {
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
  };
}

export async function GET(req: Request) {
  const debug = shouldLogB2cEnquiry();
  const incomingMeta = incomingRequestMeta(req);

  if (debug) {
    logApiDebug("route:GET /api/supervision/b2c-enquiry (incoming)", incomingMeta);
  }

  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    const body = { message: "Unauthenticated" };
    if (debug) {
      logApiDebug("route:GET /api/supervision/b2c-enquiry (response)", {
        ...incomingMeta,
        status: 401,
        responseData: body,
      });
    }
    return NextResponse.json(body, { status: 401 });
  }

  const env = getServerEnv();
  const base = env.USER_REPO_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/vivapi-user/b2c-enquiry/getAll`;

  const incoming = new URL(req.url);
  const queryString = incoming.searchParams.toString();
  const fullUrl = queryString ? `${upstreamUrl}?${queryString}` : upstreamUrl;

  try {
    const bearer = await fetchVivapiAppBearer(env);
    const headers = buildVivapiAuthorizedHeaders(env, bearer);

    if (debug) {
      logApiDebug("route:GET b2c-enquiry (upstream request)", {
        endpoint: fullUrl,
        method: "GET",
        queryParams: sanitizeForLog(Object.fromEntries(incoming.searchParams.entries())),
        requestHeaders: sanitizeHeaders(headers),
        /** Values are redacted above; confirms both headers are attached. */
        headerPresence: {
          "X-API-KEY": true,
          Authorization: true,
        },
      });
    }

    const res = await axios.get(fullUrl, {
      headers,
      timeout: 30_000,
      validateStatus: () => true,
    });

    if (debug) {
      logApiDebug("route:GET b2c-enquiry (upstream response)", {
        endpoint: fullUrl,
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
        `B2C enquiries request failed (${res.status})`;
      const body = { message: msg, status: res.status };
      if (debug) {
        logApiDebug("route:GET /api/supervision/b2c-enquiry (response)", {
          ...incomingMeta,
          status: res.status >= 400 ? res.status : 502,
          responseData: sanitizeForLog(body),
        });
      }
      return NextResponse.json(body, {
        status: res.status >= 400 ? res.status : 502,
      });
    }

    const rows = extractRecordArray(res.data);

    const body = {
      status: "success" as const,
      enquiries: rows,
      ...(rows.length === 0 ? { raw: res.data } : {}),
    };

    if (debug) {
      logApiDebug("route:GET /api/supervision/b2c-enquiry (response)", {
        ...incomingMeta,
        status: 200,
        responseData: sanitizeForLog(body),
        enquiryCount: rows.length,
      });
    }

    return NextResponse.json(body, { status: 200 });
  } catch (err: unknown) {
    const ax = err as {
      message?: string;
      response?: { data?: unknown; status?: number };
    };
    if (debug) {
      logApiDebug("route:GET b2c-enquiry (upstream error)", {
        endpoint: fullUrl,
        errorMessage: ax?.message,
        status: ax?.response?.status,
        responseData: sanitizeForLog(ax?.response?.data),
      });
    }
    const body = {
      message:
        ax?.response?.data &&
        typeof ax.response.data === "object" &&
        "message" in (ax.response.data as object)
          ? String((ax.response.data as { message?: string }).message)
          : ax?.message || "Failed to load B2C enquiries",
    };
    if (debug) {
      logApiDebug("route:GET /api/supervision/b2c-enquiry (response)", {
        ...incomingMeta,
        status: 502,
        responseData: sanitizeForLog(body),
      });
    }
    return NextResponse.json(body, { status: 502 });
  }
}
