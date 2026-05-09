import { NextResponse } from "next/server";
import axios from "axios";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { getJwtExpiryMs } from "@/lib/auth";
import { fetchVivapiAppBearer } from "@/services/vivapi/app-auth";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";
import { extractUserSessionToken } from "@/lib/user-service-token";

const AUTH_COOKIE = "sv_token";

type AuthenticateRequest = {
  userName: string;
  password: string;
  userType: number;
};

export async function POST(req: Request) {
  let body: AuthenticateRequest;
  try {
    body = (await req.json()) as AuthenticateRequest;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (isServerApiDebugEnabled()) {
    const hdr: Record<string, unknown> = {};
    req.headers.forEach((v, k) => {
      hdr[k] = v;
    });
    const incomingUrl = new URL(req.url);
    logApiDebug("route:POST /api/supervision/auth/login (incoming)", {
      endpoint: incomingUrl.pathname + incomingUrl.search,
      method: req.method,
      requestHeaders: sanitizeHeaders(hdr),
      requestBody: sanitizeForLog(body),
      queryParams: sanitizeForLog(Object.fromEntries(incomingUrl.searchParams.entries())),
    });
  }

  if (!body?.userName || !body?.password) {
    return NextResponse.json(
      { message: "Username and password are required" },
      { status: 400 }
    );
  }

  // Enforce SuperAdmin userType = 1
  const payload: AuthenticateRequest = {
    userName: body.userName,
    password: body.password,
    userType: 1,
  };

  const env = getServerEnv();
  const upstreamUrl = `${env.USER_REPO_URL.replace(/\/$/, "")}/vivapi-user/user/authenticate`;

  try {
    let gatewayBearer: string;
    try {
      // vivapi-auth call details: see fetchVivapiAppBearer when SUPERVISION_API_DEBUG=true
      gatewayBearer = await fetchVivapiAppBearer(env);
    } catch (authErr: any) {
      const msg =
        authErr?.response?.data?.message ||
        authErr?.response?.data?.error ||
        authErr?.message ||
        "Failed to obtain API token from auth service";
      return NextResponse.json(
        { message: msg, stage: "vivapi_auth" as const },
        { status: 502 }
      );
    }

    const upstreamHeaders = {
      "Content-Type": "application/json",
      "X-API-KEY": env.X_API_KEY,
      Authorization: `Bearer ${gatewayBearer}`,
    };

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:POST /api/supervision/auth/login (upstream request)", {
        endpoint: upstreamUrl,
        method: "POST",
        params: null,
        requestHeaders: sanitizeHeaders(upstreamHeaders),
        requestBody: sanitizeForLog(payload),
      });
    }

    const res = await axios.post(upstreamUrl, payload, {
      headers: upstreamHeaders,
      timeout: 20_000,
    });

    const { data } = res;

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:POST /api/supervision/auth/login (upstream response)", {
        endpoint: upstreamUrl,
        method: "POST",
        status: res.status,
        statusText: res.statusText,
        responseHeaders: sanitizeHeaders(res.headers as unknown as Record<string, unknown>),
        responseData: sanitizeForLog(data),
      });
    }

    const tokenFromUser = extractUserSessionToken(data, res.headers);
    // Some deployments only validate the user via vivapi-user but return no new JWT;
    // the gateway Bearer from vivapi-auth is still a valid JWT for middleware/cookie.
    const token = tokenFromUser ?? gatewayBearer;
    if (!token) {
      return NextResponse.json(
        {
          message:
            "User service returned success but no session JWT was found. Enable SUPERVISION_API_DEBUG=true and inspect the logged response shape, or confirm the API returns a JWT in JSON (Token/token/…) or via Authorization / Set-Cookie headers.",
          stage: "user_authenticate" as const,
        },
        { status: 502 }
      );
    }

    const expMs = getJwtExpiryMs(token);
    const maxAge =
      expMs && expMs > Date.now()
        ? Math.max(1, Math.floor((expMs - Date.now()) / 1000))
        : 60 * 60; // fallback 1h

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });

    const jsonBody = {
      status: "success" as const,
      user: (data as any)?.response ?? (data as any)?.user ?? null,
    };

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:POST /api/supervision/auth/login (client response)", {
        endpoint: "/api/supervision/auth/login",
        method: "POST",
        status: 200,
        responseData: sanitizeForLog(jsonBody),
        note: "JWT is set via httpOnly cookie only; not included in JSON body.",
      });
    }

    // Never echo the token back to the browser JS
    return NextResponse.json(jsonBody, { status: 200 });
  } catch (err: any) {
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:POST /api/supervision/auth/login (upstream error)", {
        endpoint: upstreamUrl,
        method: "POST",
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        responseHeaders: err?.response?.headers
          ? sanitizeHeaders(err.response.headers as Record<string, unknown>)
          : {},
        responseData: sanitizeForLog(err?.response?.data),
        errorMessage: err?.message,
      });
    }
    const status = err?.response?.status ?? 401;
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      "Invalid username or password";
    return NextResponse.json({ message }, { status });
  }
}

