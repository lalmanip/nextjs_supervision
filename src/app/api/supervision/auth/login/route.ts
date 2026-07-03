import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { getJwtExpiryMs } from "@/lib/auth";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";
import { normalizeSupervisionUser } from "@/lib/supervision-user-id";
import { loginViaAuthGatewayAndFetchProfile } from "@/lib/user-auth-login";

const AUTH_COOKIE = "sv_token";

type AuthenticateRequest = {
  userName: string;
  password: string;
  userType?: number;
};

export async function POST(req: Request) {
  let body: AuthenticateRequest;
  try {
    body = (await req.json()) as AuthenticateRequest;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body " },
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

  const env = getServerEnv();

  try {
    const loginResult = await loginViaAuthGatewayAndFetchProfile({
      authBaseUrl: env.AUTH_URL,
      userBaseUrl: env.USER_REPO_URL,
      apiKey: env.VIV_X_API_KEY,
      userName: body.userName,
      password: body.password,
      requiredUserType: 1,
    });

    if (!loginResult.ok) {
      const status =
        loginResult.stage === "authorization"
          ? 403
          : loginResult.stage === "vivapi_auth"
            ? 401
            : 502;
      return NextResponse.json(
        { message: loginResult.message, stage: loginResult.stage },
        { status }
      );
    }

    const user = normalizeSupervisionUser(loginResult.profile);
    if (!user?.userId) {
      return NextResponse.json(
        {
          message: "Authentication succeeded but user profile was missing",
          stage: "vivapi_user" as const,
        },
        { status: 502 }
      );
    }

    const token = loginResult.accessToken;
    const expMs = getJwtExpiryMs(token);
    const maxAge =
      expMs && expMs > Date.now()
        ? Math.max(1, Math.floor((expMs - Date.now()) / 1000))
        : 60 * 60;

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
      user,
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

    return NextResponse.json(jsonBody, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid username or password";
    return NextResponse.json({ message }, { status: 401 });
  }
}
