import type { AxiosResponse } from "axios";

/** Typical compact JWT: header.payload.signature */
const JWT_LIKE =
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+$/;

function tryParseJwtString(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const bare = t.startsWith("Bearer ") ? t.slice(7).trim() : t;
  if (JWT_LIKE.test(bare)) return bare;
  return null;
}

function pickKnownTokenFields(obj: Record<string, unknown>): string | null {
  const keys = [
    "Token",
    "token",
    "jwt",
    "JWT",
    "accessToken",
    "access_token",
    "authToken",
    "auth_token",
    "idToken",
    "id_token",
    "bearerToken",
    "sessionToken",
    "session_token",
    "securityToken",
    "jwtToken",
    "userToken",
  ] as const;

  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) {
      const j = tryParseJwtString(v);
      if (j) return j;
    }
  }
  return null;
}

function walkForJwtString(value: unknown, depth: number): string | null {
  if (depth > 8) return null;
  if (typeof value === "string") {
    return tryParseJwtString(value);
  }
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const f = walkForJwtString(item, depth + 1);
      if (f) return f;
    }
    return null;
  }
  const obj = value as Record<string, unknown>;
  const direct = pickKnownTokenFields(obj);
  if (direct) return direct;
  for (const v of Object.values(obj)) {
    const f = walkForJwtString(v, depth + 1);
    if (f) return f;
  }
  return null;
}

function normalizeAxiosHeaders(
  headers: AxiosResponse["headers"] | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;

  const h = headers as unknown as {
    get?: (name: string) => unknown;
    forEach?: (fn: (value: string, name: string) => void) => void;
  };

  if (typeof h.forEach === "function") {
    h.forEach((value, name) => {
      out[String(name).toLowerCase()] = Array.isArray(value)
        ? value.join(", ")
        : String(value ?? "");
    });
    return out;
  }

  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    out[String(k).toLowerCase()] = Array.isArray(v)
      ? v.map(String).join(", ")
      : String(v ?? "");
  }
  return out;
}

function extractFromResponseHeaders(
  headers: AxiosResponse["headers"] | undefined
): string | null {
  const h = normalizeAxiosHeaders(headers);

  const auth = h["authorization"];
  if (auth) {
    const m = auth.match(/Bearer\s+([A-Za-z0-9._-]+)/i);
    if (m?.[1]) return m[1];
  }

  for (const key of ["x-access-token", "x-auth-token", "x-jwt", "token"]) {
    const v = h[key];
    if (v) {
      const j = tryParseJwtString(v);
      if (j) return j;
    }
  }

  const setCookieRaw = (headers as Record<string, unknown> | undefined)?.[
    "set-cookie"
  ];
  const cookies = Array.isArray(setCookieRaw)
    ? setCookieRaw
    : setCookieRaw
      ? [String(setCookieRaw)]
      : [];

  for (const line of cookies) {
    const m = String(line).match(JWT_LIKE);
    if (m?.[0]) return m[0];
  }

  return null;
}

/**
 * Resolves session JWT from vivapi-user authenticate (or similar) responses.
 * Checks common JSON shapes, then response headers, then JWT-shaped strings in the tree.
 */
export function extractUserSessionToken(
  data: unknown,
  responseHeaders: AxiosResponse["headers"] | undefined
): string | null {
  const fromHeaders = extractFromResponseHeaders(responseHeaders);
  if (fromHeaders) return fromHeaders;

  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;

  const top = pickKnownTokenFields(root);
  if (top) return top;

  for (const nestKey of ["response", "data", "result", "payload"]) {
    const nest = root[nestKey];
    if (nest && typeof nest === "object") {
      const inner = pickKnownTokenFields(nest as Record<string, unknown>);
      if (inner) return inner;
    }
  }

  return walkForJwtString(data, 0);
}
