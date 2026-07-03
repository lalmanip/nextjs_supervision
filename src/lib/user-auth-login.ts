type GenericUserEnvelope = {
  status?: string;
  message?: string | null;
  response?: Record<string, unknown> | null;
};

export type UserAuthLoginResult =
  | { ok: true; accessToken: string; profile: Record<string, unknown> }
  | { ok: false; message: string; stage: "vivapi_auth" | "vivapi_user" | "authorization" };

function readAuthErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;
  const message = obj.message ?? obj.error;
  if (typeof message === "string" && message.trim()) return message.trim();
  return fallback;
}

function readAccessToken(data: Record<string, unknown>): string | null {
  const token = data.Token ?? data.token;
  if (typeof token === "string" && token.trim()) return token.trim();
  return null;
}

/** Login via vivapi-auth, then load profile from GET /user/me. */
export async function loginViaAuthGatewayAndFetchProfile(options: {
  authBaseUrl: string;
  userBaseUrl: string;
  apiKey: string;
  userName: string;
  password: string;
  requiredUserType?: number;
}): Promise<UserAuthLoginResult> {
  const authBase = options.authBaseUrl.replace(/\/$/, "");
  const userBase = options.userBaseUrl.replace(/\/$/, "");

  let loginRes: Response;
  try {
    loginRes = await fetch(`${authBase}/vivapi-auth/user/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": options.apiKey,
      },
      body: JSON.stringify({
        username: options.userName.trim(),
        password: options.password,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth service unreachable";
    return { ok: false, message, stage: "vivapi_auth" };
  }

  const loginText = await loginRes.text().catch(() => "");
  let loginJson: Record<string, unknown> | null = null;
  try {
    loginJson = loginText ? (JSON.parse(loginText) as Record<string, unknown>) : null;
  } catch {
    return {
      ok: false,
      message: "Invalid JSON from auth service",
      stage: "vivapi_auth",
    };
  }

  if (!loginRes.ok) {
    return {
      ok: false,
      message: readAuthErrorMessage(loginJson, "Invalid username or password"),
      stage: "vivapi_auth",
    };
  }

  const accessToken = readAccessToken(loginJson ?? {});
  if (!accessToken) {
    return {
      ok: false,
      message: "Auth service did not return an access token",
      stage: "vivapi_auth",
    };
  }

  let meRes: Response;
  try {
    meRes = await fetch(`${userBase}/vivapi-user/user/me`, {
      method: "GET",
      headers: {
        "X-API-KEY": options.apiKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "User service unreachable";
    return { ok: false, message, stage: "vivapi_user" };
  }

  const meText = await meRes.text().catch(() => "");
  let meJson: GenericUserEnvelope | null = null;
  try {
    meJson = meText ? (JSON.parse(meText) as GenericUserEnvelope) : null;
  } catch {
    return {
      ok: false,
      message: "Invalid JSON from user service",
      stage: "vivapi_user",
    };
  }

  if (!meRes.ok || meJson?.status !== "success" || !meJson.response) {
    return {
      ok: false,
      message: readAuthErrorMessage(meJson, "Unable to load user profile"),
      stage: "vivapi_user",
    };
  }

  const profile = meJson.response;
  if (
    options.requiredUserType != null &&
    profile.userType !== options.requiredUserType
  ) {
    return {
      ok: false,
      message: "This account is not authorized for SuperAdmin supervision",
      stage: "authorization",
    };
  }

  return { ok: true, accessToken, profile };
}
