import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { fetchVivapiAppBearer } from "@/services/vivapi/app-auth";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";
import type { AgencyBalanceResponse } from "@/types/agency-balance";

const AUTH_COOKIE = "sv_token";

const bodySchema = z.object({
  AgencyName: z.string().min(1, "Agency name is required"),
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
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
  const base = env.MT_REPO_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/vivapi-mt/rest/get-agency-balance`;
  const payload = { AgencyName: parsed.data.AgencyName };

  try {
    const bearer = await fetchVivapiAppBearer(env);
    const headers = {
      "Content-Type": "application/json",
      "X-API-KEY": env.VIV_X_API_KEY,
      Authorization: `Bearer ${bearer}`,
    };

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:POST agency-balance (upstream)", {
        endpoint: upstreamUrl,
        method: "POST",
        requestHeaders: sanitizeHeaders(headers),
        requestBody: sanitizeForLog(payload),
      });
    }

    const res = await axios.post<AgencyBalanceResponse>(upstreamUrl, payload, {
      headers,
      timeout: 30_000,
      validateStatus: () => true,
    });

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:POST agency-balance (upstream response)", {
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
        (res.data as { Message?: string })?.Message ||
        (res.data as { message?: string })?.message ||
        `Agency balance request failed (${res.status})`;
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
      logApiDebug("route:POST agency-balance (error)", {
        endpoint: upstreamUrl,
        errorMessage: ax?.message,
        responseData: sanitizeForLog(ax?.response?.data),
        status: ax?.response?.status,
      });
    }
    return NextResponse.json(
      {
        message:
          ax?.message ||
          "Failed to load agency balance",
      },
      { status: 502 }
    );
  }
}
