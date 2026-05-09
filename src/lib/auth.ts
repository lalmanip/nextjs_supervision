import { decodeJwt } from "jose";

export type DecodedJwt = ReturnType<typeof decodeJwt>;

export function safeDecodeJwt(token: string): DecodedJwt | null {
  try {
    return decodeJwt(token);
  } catch {
    return null;
  }
}

export function getJwtExpiryMs(token: string): number | null {
  const decoded = safeDecodeJwt(token);
  if (!decoded?.exp) return null;
  return decoded.exp * 1000;
}

export function isJwtExpired(token: string, skewMs = 15_000): boolean {
  const expMs = getJwtExpiryMs(token);
  if (!expMs) return false;
  return Date.now() >= expMs - skewMs;
}

