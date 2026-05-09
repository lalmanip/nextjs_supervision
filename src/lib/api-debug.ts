/**
 * Opt-in API tracing for troubleshooting. Never log raw secrets when enabled:
 * passwords, tokens, and auth headers are redacted.
 *
 * Client (browser): NEXT_PUBLIC_SUPERVISION_API_DEBUG=true
 * Server (Route Handlers, etc.): SUPERVISION_API_DEBUG=true
 */

const SENSITIVE_KEYS = new Set(
  [
    "password",
    "passwd",
    "token",
    "jwt",
    "accesstoken",
    "access_token",
    "refreshtoken",
    "refresh_token",
    "authorization",
    "cookie",
    "set-cookie",
    "sv_token",
    "secret",
    "apikey",
    "api_key",
    "x-api-key",
    "clientsecret",
    "client_secret",
  ].map((k) => k.toLowerCase())
);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[MaxDepth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 500)}… [truncated]`;
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForLog(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(k)) {
      out[k] = v === undefined || v === null ? v : "[REDACTED]";
    } else {
      out[k] = sanitizeForLog(v, depth + 1);
    }
  }
  return out;
}

export function sanitizeHeaders(
  headers: Record<string, unknown> | undefined | null
): Record<string, string> {
  if (!headers || typeof headers !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    const val =
      v === undefined || v === null
        ? ""
        : Array.isArray(v)
          ? v.join(", ")
          : String(v);
    if (
      isSensitiveKey(key) ||
      key === "authorization" ||
      key === "cookie" ||
      key === "set-cookie"
    ) {
      out[k] = val ? "[REDACTED]" : "";
    } else {
      out[k] = val.length > 500 ? `${val.slice(0, 500)}…` : val;
    }
  }
  return out;
}

export function isClientApiDebugEnabled(): boolean {
  if (typeof process === "undefined" || !process.env) return false;
  const v = process.env.NEXT_PUBLIC_SUPERVISION_API_DEBUG;
  return v === "true" || v === "1";
}

export function isServerApiDebugEnabled(): boolean {
  if (typeof process === "undefined" || !process.env) return false;
  const v = process.env.SUPERVISION_API_DEBUG;
  return v === "true" || v === "1";
}

const PREFIX = "[Supervision API]";

export function logApiDebug(scope: string, payload: Record<string, unknown>): void {
  const line = {
    scope,
    ...payload,
    at: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console -- intentional troubleshooting output
  console.log(PREFIX, JSON.stringify(line, null, 2));
}
