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
  status: z.string(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
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
  const upstreamUrl = `${base}/vivapi-user/user/update/${encodeURIComponent(id)}`;
  const upstreamBody = { status: parsed.data.status };

  try {
    const bearer = await fetchVivapiAppBearer(env);
    const headers = buildVivapiAuthorizedHeaders(env, bearer);

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT user update (upstream)", {
        endpoint: upstreamUrl,
        method: "PUT",
        requestHeaders: sanitizeHeaders(headers),
        requestBody: sanitizeForLog(upstreamBody),
      });
    }

    const res = await axios.put(upstreamUrl, upstreamBody, {
      headers,
      timeout: 30_000,
      validateStatus: () => true,
    });

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT user update (upstream response)", {
        endpoint: upstreamUrl,
        status: res.status,
        statusText: res.statusText,
        responseData: sanitizeForLog(res.data),
      });
    }

    if (res.status < 200 || res.status >= 300) {
      const data = res.data as { message?: string | null; error?: string };
      const msg =
        data?.message ||
        data?.error ||
        `User update failed (${res.status})`;
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
    const ax = err as { message?: string; response?: { data?: unknown } };
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT user update (error)", {
        endpoint: upstreamUrl,
        errorMessage: ax?.message,
        responseData: sanitizeForLog(ax?.response?.data),
      });
    }
    return NextResponse.json(
      { message: ax?.message || "Failed to update user" },
      { status: 502 }
    );
  }
}
