import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import {
  buildVivapiAuthorizedHeaders,
  fetchVivapiAppBearer,
} from "@/services/vivapi/app-auth";
import { b2bWalletRequestReviewBodySchema } from "@/types/b2b-wallet-request";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function proxyB2bWalletRequestAction(
  req: Request,
  context: RouteContext,
  action: "approve" | "reject"
) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { requestId } = await context.params;
  if (!requestId || !/^\d+$/.test(requestId)) {
    return NextResponse.json({ message: "Invalid request id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = b2bWalletRequestReviewBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid body";
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  const upstreamBody = {
    reviewedByUserId: parsed.data.reviewedByUserId,
    remarks: parsed.data.remarks ?? "",
  };

  const env = getServerEnv();
  const base = env.USER_REPO_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/vivapi-user/user/b2b/wallet/requests/${encodeURIComponent(
    requestId
  )}/${action}`;

  try {
    const bearer = await fetchVivapiAppBearer(env);
    const headers = buildVivapiAuthorizedHeaders(env, bearer);

    if (isServerApiDebugEnabled()) {
      logApiDebug(`route:POST b2b wallet request ${action} (upstream)`, {
        endpoint: upstreamUrl,
        method: "POST",
        requestHeaders: sanitizeHeaders(headers),
        requestBody: sanitizeForLog(upstreamBody),
      });
    }

    const res = await axios.post(upstreamUrl, upstreamBody, {
      headers,
      timeout: 30_000,
      validateStatus: () => true,
    });

    if (isServerApiDebugEnabled()) {
      logApiDebug(`route:POST b2b wallet request ${action} (upstream response)`, {
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
        `Wallet request ${action} failed (${res.status})`;
      return NextResponse.json(
        { message: msg, status: res.status },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    const envelope = res.data as { message?: string | null; status?: string };
    return NextResponse.json(
      {
        status: "success" as const,
        data: res.data,
        message: envelope.message ?? null,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const ax = err as { message?: string; response?: { data?: unknown } };
    if (isServerApiDebugEnabled()) {
      logApiDebug(`route:POST b2b wallet request ${action} (error)`, {
        endpoint: upstreamUrl,
        errorMessage: ax?.message,
        responseData: sanitizeForLog(ax?.response?.data),
      });
    }
    return NextResponse.json(
      { message: ax?.message || `Failed to ${action} wallet request` },
      { status: 502 }
    );
  }
}
