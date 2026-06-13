import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import {
  buildVivapiAuthorizedHeaders,
  fetchVivapiAppBearer,
} from "@/services/vivapi/app-auth";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

export function shouldLogHolidaysBff(): boolean {
  return isServerApiDebugEnabled() || process.env.NODE_ENV === "development";
}

export async function requireSupervisionAuth(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }
  return null;
}

export function holidaysApiBase(): string {
  return getServerEnv().HOLIDAYS_API_URL.replace(/\/$/, "");
}

export async function proxyHolidaysRequest(options: {
  method: "GET" | "PUT" | "POST";
  upstreamPath: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  logLabel: string;
}): Promise<NextResponse> {
  const debug = shouldLogHolidaysBff();
  const base = holidaysApiBase();
  const qs = new URLSearchParams();
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== "") qs.set(k, v);
    }
  }
  const upstreamUrl = `${base}${options.upstreamPath}${
    qs.toString() ? `?${qs.toString()}` : ""
  }`;

  try {
    const env = getServerEnv();
    const bearer = await fetchVivapiAppBearer(env);
    const headers = buildVivapiAuthorizedHeaders(env, bearer);

    if (debug) {
      logApiDebug(`${options.logLabel} (upstream request)`, {
        endpoint: upstreamUrl,
        method: options.method,
        requestBody: options.body !== undefined ? sanitizeForLog(options.body) : undefined,
        requestHeaders: sanitizeHeaders(headers),
      });
    }

    const res = await axios.request({
      url: upstreamUrl,
      method: options.method,
      headers,
      data: options.body,
      timeout: 60_000,
      validateStatus: () => true,
    });

    if (debug) {
      logApiDebug(`${options.logLabel} (upstream response)`, {
        endpoint: upstreamUrl,
        status: res.status,
        responseData: sanitizeForLog(res.data),
      });
    }

    if (res.status < 200 || res.status >= 300) {
      const msg =
        (res.data as { message?: string })?.message ||
        (res.data as { error?: string })?.error ||
        `Holidays API failed (${res.status})`;
      return NextResponse.json(
        { message: msg, data: res.data },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    return NextResponse.json(
      { status: "success" as const, data: res.data },
      { status: 200 }
    );
  } catch (err: unknown) {
    const ax = err as { message?: string; response?: { data?: unknown; status?: number } };
    if (debug) {
      logApiDebug(`${options.logLabel} (upstream error)`, {
        endpoint: upstreamUrl,
        errorMessage: ax?.message,
        responseData: sanitizeForLog(ax?.response?.data),
      });
    }
    return NextResponse.json(
      { message: ax?.message || "Failed to reach holidays API" },
      { status: 502 }
    );
  }
}
