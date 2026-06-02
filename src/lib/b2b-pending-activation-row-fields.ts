export type B2bPendingActivationLoose = Record<string, unknown>;

const STATUS_KEYS = ["status", "Status", "userStatus", "user_status"] as const;

const USER_OID_KEYS = [
  "userOid",
  "user_oid",
  "UserOid",
  "User_oid",
  "oid",
  "OID",
] as const;

export function getB2bPendingActivationRowId(
  row: B2bPendingActivationLoose
): number | null {
  const v = row.id ?? row.Id ?? row.ID ?? row.userId ?? row.user_id ?? row.UserId;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  return null;
}

/** Wallet initialize URL segment (falls back to row id when oid is absent). */
export function getB2bPendingActivationUserOid(
  row: B2bPendingActivationLoose
): number | null {
  for (const key of USER_OID_KEYS) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  }
  return getB2bPendingActivationRowId(row);
}

export function pendingActivationSummary(row: B2bPendingActivationLoose): string {
  const oid = getB2bPendingActivationUserOid(row);
  const name =
    row.agencyName ??
    row.agency_name ??
    row.companyName ??
    row.company_name ??
    row.name ??
    row.email;
  const parts = [
    oid != null ? `user ${oid}` : null,
    name != null && String(name).trim() ? String(name) : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "this agent";
}

export function isB2bPendingActivationStatusColumn(key: string): boolean {
  const lower = key.toLowerCase();
  return STATUS_KEYS.some((k) => k.toLowerCase() === lower);
}

export function getB2bPendingActivationStatus(
  row: B2bPendingActivationLoose
): string | null {
  for (const key of STATUS_KEYS) {
    const v = row[key];
    if (typeof v === "string") return v;
    if (v === null) return null;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
  }
  return null;
}

/** Status value after admin approval (API uses numeric 1). */
export function isB2bApprovedStatus(status: string | null | undefined): boolean {
  if (status === null || status === undefined) return false;
  const s = String(status).trim().toLowerCase();
  return s === "1" || s === "approved" || s === "active";
}

export function formatB2bActivationStatus(status: string | null | undefined): string {
  if (status === null || status === undefined || !String(status).trim()) return "—";
  if (isB2bApprovedStatus(status)) return "Approved";
  const s = String(status).trim();
  if (s === "0" || s.toLowerCase() === "pending") return "Pending";
  return s;
}
