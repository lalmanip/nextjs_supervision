import type { SupervisionUser } from "@/features/auth/auth.types";
import type { DecodedJwt } from "@/lib/auth";

const USER_ID_KEYS = [
  "userId",
  "user_id",
  "UserId",
  "USER_ID",
  "id",
  "Id",
  "ID",
  "userOid",
  "user_oid",
  "UserOid",
  "nameid",
  "nameId",
  "sub",
] as const;

export function parsePositiveIntId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const n = Number(value.trim());
    return n > 0 ? n : null;
  }
  return null;
}

export function getUserIdFromRecord(
  record: Record<string, unknown> | null | undefined
): number | null {
  if (!record) return null;
  for (const key of USER_ID_KEYS) {
    if (!(key in record)) continue;
    const id = parsePositiveIntId(record[key]);
    if (id) return id;
  }
  return null;
}

export function getUserIdFromJwt(
  decoded: DecodedJwt | null | undefined
): number | null {
  if (!decoded || typeof decoded !== "object") return null;
  return getUserIdFromRecord(decoded as Record<string, unknown>);
}

/** Resolves the numeric supervision user id from store user or API/JWT shapes. */
export function resolveSupervisionUserId(
  user: SupervisionUser | null | undefined
): number | null {
  if (!user) return null;
  if (user.userId && user.userId > 0) return user.userId;
  return getUserIdFromRecord(user as Record<string, unknown>);
}

export function normalizeSupervisionUser(raw: unknown): SupervisionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const userId = getUserIdFromRecord(r);
  const userTypeRaw = r.userType ?? r.user_type ?? r.UserType;
  const userType =
    typeof userTypeRaw === "number" && Number.isFinite(userTypeRaw)
      ? userTypeRaw
      : undefined;

  return {
    userId: userId ?? undefined,
    userType,
    email:
      typeof r.email === "string"
        ? r.email
        : typeof r.Email === "string"
          ? r.Email
          : null,
    userName:
      typeof r.userName === "string"
        ? r.userName
        : typeof r.user_name === "string"
          ? r.user_name
          : typeof r.username === "string"
            ? r.username
            : typeof r.UserName === "string"
              ? r.UserName
              : undefined,
    firstName:
      typeof r.firstName === "string"
        ? r.firstName
        : typeof r.first_name === "string"
          ? r.first_name
          : null,
    lastName:
      typeof r.lastName === "string"
        ? r.lastName
        : typeof r.last_name === "string"
          ? r.last_name
          : null,
  };
}
