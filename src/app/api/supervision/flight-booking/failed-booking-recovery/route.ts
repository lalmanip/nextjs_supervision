import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { fetchVivapiAppBearer } from "@/services/vivapi/app-auth";
import { extractRecordArray } from "@/lib/api-response-array";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const env = getServerEnv();
  const base = env.USER_REPO_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/vivapi-user/flight-booking/failed-booking-recovery`;

  const incoming = new URL(req.url);
  const queryString = incoming.searchParams.toString();
  const fullUrl = queryString ? `${upstreamUrl}?${queryString}` : upstreamUrl;

  try {
    const bearer = await fetchVivapiAppBearer(env);

    const headers = {
      "Content-Type": "application/json",
      "X-API-KEY": env.VIV_X_API_KEY,
      Authorization: `Bearer ${bearer}`,
    };

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:GET failed-booking-recovery (upstream)", {
        endpoint: fullUrl,
        method: "GET",
        queryParams: sanitizeForLog(Object.fromEntries(incoming.searchParams.entries())),
        requestHeaders: sanitizeHeaders(headers),
      });
    }

    const res = await axios.get(fullUrl, {
      headers,
      timeout: 30_000,
      validateStatus: () => true,
    });

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:GET failed-booking-recovery (upstream response)", {
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
        `Failed booking recovery request failed (${res.status})`;
      return NextResponse.json(
        { message: msg, status: res.status },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    const rows = extractRecordArray(res.data);

    return NextResponse.json(
      {
        status: "success" as const,
        failedBookings: rows,
        ...(rows.length === 0 ? { raw: res.data } : {}),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const ax = err as {
      message?: string;
      response?: { data?: unknown; status?: number };
    };
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:GET failed-booking-recovery (error)", {
        endpoint: fullUrl,
        errorMessage: ax?.message,
        responseData: sanitizeForLog(ax?.response?.data),
        status: ax?.response?.status,
      });
    }
    return NextResponse.json(
      {
        message:
          ax?.response?.data &&
          typeof ax.response.data === "object" &&
          "message" in (ax.response.data as object)
            ? String((ax.response.data as { message?: string }).message)
            : ax?.message || "Failed to load failed booking recovery queue",
      },
      { status: 502 }
    );
  }
}
