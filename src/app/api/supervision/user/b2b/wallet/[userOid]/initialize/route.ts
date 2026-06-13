import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import {
  buildVivapiAuthorizedHeaders,
  fetchVivapiAppBearer,
} from "@/services/vivapi/app-auth";
import {
  b2bWalletInitializeBodySchema,
  type B2bWalletSnapshot,
} from "@/types/b2b-wallet-initialize";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

const AUTH_COOKIE = "sv_token";

type RouteContext = { params: Promise<{ userOid: string }> };

export async function POST(req: Request, context: RouteContext) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const { userOid } = await context.params;
  if (!userOid || !/^\d+$/.test(userOid)) {
    return NextResponse.json({ message: "Invalid user OID" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = b2bWalletInitializeBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid body";
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  const upstreamBody = {
    initialBalance: parsed.data.initialBalance,
    initialCreditLimit: parsed.data.initialCreditLimit,
    currencyConverterFk: parsed.data.currencyConverterFk,
    performedByUserId: parsed.data.performedByUserId,
  };

  const env = getServerEnv();
  const base = env.USER_REPO_URL.replace(/\/$/, "");
  const upstreamUrl = `${base}/vivapi-user/user/b2b/wallet/${encodeURIComponent(
    userOid
  )}/initialize`;

  try {
    const bearer = await fetchVivapiAppBearer(env);
    const headers = buildVivapiAuthorizedHeaders(env, bearer);

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:POST b2b wallet initialize (upstream)", {
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
      logApiDebug("route:POST b2b wallet initialize (upstream response)", {
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
        `Wallet initialize failed (${res.status})`;
      return NextResponse.json(
        { message: msg, status: res.status },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    const envelope = res.data as {
      response?: B2bWalletSnapshot;
      message?: string | null;
      status?: string;
    };

    const wallet = envelope.response;
    if (!wallet || typeof wallet !== "object") {
      return NextResponse.json(
        { message: "Wallet initialized but details were missing in the response" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        status: "success" as const,
        wallet,
        message: envelope.message ?? null,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const ax = err as { message?: string; response?: { data?: unknown } };
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:POST b2b wallet initialize (error)", {
        endpoint: upstreamUrl,
        errorMessage: ax?.message,
        responseData: sanitizeForLog(ax?.response?.data),
      });
    }
    return NextResponse.json(
      { message: ax?.message || "Failed to initialize wallet" },
      { status: 502 }
    );
  }
}
