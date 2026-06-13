import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { fetchVivapiAppBearer } from "@/services/vivapi/app-auth";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: RouteContext) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const adminNotes =
    body && typeof body === "object" && "adminNotes" in (body as object)
      ? (body as { adminNotes?: unknown }).adminNotes
      : undefined;
  if (typeof adminNotes !== "string") {
    return NextResponse.json(
      { message: 'Body must be { "adminNotes": "..." }' },
      { status: 400 }
    );
  }

  const env = getServerEnv();
  const base = env.USER_REPO_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/vivapi-user/flight-booking/failed-booking-recovery/${encodeURIComponent(
    id
  )}/admin-notes`;

  try {
    const bearer = await fetchVivapiAppBearer(env);
    const headers = {
      "Content-Type": "application/json",
      "X-API-KEY": env.VIV_X_API_KEY,
      Authorization: `Bearer ${bearer}`,
    };

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT failed-booking-recovery admin-notes (upstream)", {
        endpoint: upstreamUrl,
        method: "PUT",
        requestBody: sanitizeForLog({ adminNotes }),
        requestHeaders: sanitizeHeaders(headers),
      });
    }

    const res = await axios.put(
      upstreamUrl,
      { adminNotes },
      { headers, timeout: 30_000, validateStatus: () => true }
    );

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT failed-booking-recovery admin-notes (upstream response)", {
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
        `Update admin notes failed (${res.status})`;
      return NextResponse.json(
        { message: msg, status: res.status },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    return NextResponse.json(
      { status: "success" as const, data: res.data },
      { status: 200 }
    );
  } catch (err: unknown) {
    const ax = err as {
      message?: string;
      response?: { data?: unknown; status?: number };
    };
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT failed-booking-recovery admin-notes (error)", {
        endpoint: upstreamUrl,
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
            : ax?.message || "Failed to update admin notes",
      },
      { status: 502 }
    );
  }
}

