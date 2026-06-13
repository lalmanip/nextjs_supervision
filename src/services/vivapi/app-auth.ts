import axios, { isAxiosError } from "axios";
import type { ServerEnv } from "@/lib/env";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";

export type VivapiAppAuthLoginBody = {
  domain_key: string;
  username: string;
  password: string;
  system: string;
};

/** POST /vivapi-auth/app/auth/login — returns gateway Bearer for downstream APIs. */
export function extractVivapiAppToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const from = (obj: Record<string, unknown>): string | null => {
    const cap = obj.Token;
    if (typeof cap === "string" && cap.length > 0) return cap;
    const lower = obj.token;
    if (typeof lower === "string" && lower.length > 0) return lower;
    return null;
  };

  const top = from(p);
  if (top) return top;

  const wrapped = p.data;
  if (wrapped && typeof wrapped === "object") {
    const inner = from(wrapped as Record<string, unknown>);
    if (inner) return inner;
  }

  return null;
}

function headersToRecord(h: unknown): Record<string, unknown> {
  if (!h || typeof h !== "object") return {};
  const raw = h as { forEach?: (fn: (v: string, k: string) => void) => void };
  if (typeof raw.forEach === "function") {
    const out: Record<string, unknown> = {};
    raw.forEach((value, name) => {
      out[String(name)] = value;
    });
    return out;
  }
  return { ...(h as Record<string, unknown>) };
}

/**
 * Calls `POST {AUTH_URL}/vivapi-auth/app/auth/login`.
 * When `SUPERVISION_API_DEBUG=true`, logs full request/response metadata (secrets redacted).
 */
export async function fetchVivapiAppBearer(
  env: ServerEnv,
  options?: { signal?: AbortSignal }
): Promise<string> {
  const base = env.AUTH_URL.replace(/\/$/, "");
  const url = `${base}/vivapi-auth/app/auth/login`;
  const body: VivapiAppAuthLoginBody = {
    domain_key: env.AUTH_APP_DOMAIN_KEY,
    username: env.AUTH_APP_USERNAME,
    password: env.AUTH_APP_PASSWORD,
    system: env.AUTH_APP_SYSTEM,
  };

  const requestHeaders = {
    "Content-Type": "application/json",
    "X-API-KEY": env.VIV_X_API_KEY,
  };

  if (isServerApiDebugEnabled()) {
    logApiDebug("vivapi-auth/app/auth/login → request", {
      endpoint: url,
      method: "POST",
      queryParams: null,
      requestHeaders: sanitizeHeaders(requestHeaders),
      requestBody: sanitizeForLog(body),
      axios: { timeoutMs: 20_000, withCredentials: false },
    });
  }

  try {
    const res = await axios.post(url, body, {
      headers: requestHeaders,
      timeout: 20_000,
      signal: options?.signal,
      validateStatus: () => true,
    });

    if (isServerApiDebugEnabled()) {
      logApiDebug("vivapi-auth/app/auth/login → response", {
        endpoint: url,
        method: "POST",
        status: res.status,
        statusText: res.statusText,
        responseHeaders: sanitizeHeaders(headersToRecord(res.headers)),
        responseData: sanitizeForLog(res.data),
        tokenPresentInBody: extractVivapiAppToken(res.data) != null,
      });
    }

    if (res.status < 200 || res.status >= 300) {
      const msg =
        (res.data as { message?: string })?.message ||
        (res.data as { error?: string })?.error ||
        `Auth service returned HTTP ${res.status}`;
      const err = new Error(msg);
      (err as Error & { response?: typeof res }).response = res;
      throw err;
    }

    const token = extractVivapiAppToken(res.data);
    if (!token) {
      if (isServerApiDebugEnabled()) {
        logApiDebug("vivapi-auth/app/auth/login → parse error", {
          endpoint: url,
          message:
            "Response OK but no Token/token found in body (see responseData above).",
        });
      }
      throw new Error("Auth service response did not include Token");
    }

    if (isServerApiDebugEnabled()) {
      logApiDebug("vivapi-auth/app/auth/login → token extracted", {
        endpoint: url,
        jwtCharLength: token.length,
        note: "Raw JWT is never logged.",
      });
    }

    return token;
  } catch (err: unknown) {
    if (isServerApiDebugEnabled()) {
      if (isAxiosError(err)) {
        const cfg = err.config;
        logApiDebug("vivapi-auth/app/auth/login → axios error", {
          endpoint: url,
          method: cfg?.method?.toUpperCase() ?? "POST",
          requestUrl: cfg?.url,
          baseURL: cfg?.baseURL,
          requestHeaders: cfg?.headers
            ? sanitizeHeaders(headersToRecord(cfg.headers))
            : {},
          requestBody: cfg?.data ? sanitizeForLog(cfg.data) : sanitizeForLog(body),
          errorCode: err.code,
          errorMessage: err.message,
          responseStatus: err.response?.status,
          responseStatusText: err.response?.statusText,
          responseHeaders: err.response?.headers
            ? sanitizeHeaders(headersToRecord(err.response.headers))
            : {},
          responseData: sanitizeForLog(err.response?.data),
        });
      } else {
        logApiDebug("vivapi-auth/app/auth/login → error", {
          endpoint: url,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    }
    throw err;
  }
}

/** Headers required by vivapi-user / vivapi-mt (X-API-KEY + Bearer from app login). */
export function buildVivapiAuthorizedHeaders(
  env: ServerEnv,
  bearer: string
): Record<string, string> {
  const apiKey = env.VIV_X_API_KEY?.trim();
  const token = bearer?.trim();
  if (!apiKey) {
    throw new Error("X-API-KEY is not configured (set VIV_X_API_KEY in .env.local)");
  }
  if (!token) {
    throw new Error("Bearer token is empty (vivapi-auth app login did not return a token)");
  }
  return {
    "Content-Type": "application/json",
    "X-API-KEY": apiKey,
    Authorization: `Bearer ${token}`,
  };
}
