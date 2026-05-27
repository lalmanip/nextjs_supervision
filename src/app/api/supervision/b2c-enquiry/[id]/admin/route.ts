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
  B2C_ENQUIRY_STATUS_VALUES,
  normalizeB2cEnquiryStatus,
} from "@/types/b2c-enquiry";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

const bodySchema = z
  .object({
    adminNotes: z.union([z.string(), z.null()]).optional(),
    status: z.string().optional(),
  })
  .refine(
    (data) => data.adminNotes !== undefined || data.status !== undefined,
    { message: "Body must include adminNotes and/or status" }
  );

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ message: "Invalid enquiry id" }, { status: 400 });
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

  const upstreamBody: { adminNotes?: string | null; status?: string } = {};

  if (parsed.data.adminNotes !== undefined) {
    upstreamBody.adminNotes = parsed.data.adminNotes;
  }

  if (parsed.data.status !== undefined) {
    const normalized = normalizeB2cEnquiryStatus(parsed.data.status);
    if (!normalized) {
      return NextResponse.json(
        {
          message: `Invalid status. Use one of: ${B2C_ENQUIRY_STATUS_VALUES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    upstreamBody.status = normalized;
  }

  const env = getServerEnv();
  const base = env.USER_REPO_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/vivapi-user/b2c-enquiry/${encodeURIComponent(id)}/admin`;

  try {
    const bearer = await fetchVivapiAppBearer(env);
    const headers = buildVivapiAuthorizedHeaders(env, bearer);

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT b2c-enquiry admin (upstream)", {
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
      logApiDebug("route:PUT b2c-enquiry admin (upstream response)", {
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
        `Update enquiry admin fields failed (${res.status})`;
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
    const ax = err as { message?: string; response?: { data?: unknown } };
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:PUT b2c-enquiry admin (error)", {
        endpoint: upstreamUrl,
        errorMessage: ax?.message,
        responseData: sanitizeForLog(ax?.response?.data),
      });
    }
    return NextResponse.json(
      { message: ax?.message || "Failed to update enquiry" },
      { status: 502 }
    );
  }
}
