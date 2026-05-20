import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { z } from "zod";
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

const bodySchema = z.object({
  remarks: z.string(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ message: "Invalid ticket id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid body";
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  const env = getServerEnv();
  const base = env.USER_REPO_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/vivapi-user/flight-booking/cancelled-tickets/${id}/remarks`;
  const payload = { remarks: parsed.data.remarks };

  try {
    const bearer = await fetchVivapiAppBearer(env);
    const headers = buildVivapiAuthorizedHeaders(env, bearer);

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT cancelled-tickets remarks (upstream)", {
        endpoint: upstreamUrl,
        method: "PUT",
        requestHeaders: sanitizeHeaders(headers),
        requestBody: sanitizeForLog(payload),
      });
    }

    const res = await axios.put(upstreamUrl, payload, {
      headers,
      timeout: 30_000,
      validateStatus: () => true,
    });

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT cancelled-tickets remarks (upstream response)", {
        endpoint: upstreamUrl,
        status: res.status,
        statusText: res.statusText,
        responseData: sanitizeForLog(res.data),
      });
    }

    if (res.status < 200 || res.status >= 300) {
      const msg =
        (res.data as { message?: string })?.message ||
        (res.data as { error?: string })?.error ||
        `Update remarks failed (${res.status})`;
      return NextResponse.json(
        { message: msg, data: res.data },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    const data = res.data as {
      response?: Record<string, unknown>;
      status?: string;
    };
    const ticket = data.response ?? (res.data as Record<string, unknown>);

    return NextResponse.json(
      {
        status: "success" as const,
        ticket,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const ax = err as { message?: string; response?: { data?: unknown } };
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT cancelled-tickets remarks (error)", {
        endpoint: upstreamUrl,
        errorMessage: ax?.message,
        responseData: sanitizeForLog(ax?.response?.data),
      });
    }
    return NextResponse.json(
      { message: ax?.message || "Failed to update remarks" },
      { status: 502 }
    );
  }
}
