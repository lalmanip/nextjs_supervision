export type B2bPendingActivationLoose = Record<string, unknown>;

const STATUS_KEYS = ["status", "Status", "userStatus", "user_status"] as const;

export function getB2bPendingActivationRowId(
  row: B2bPendingActivationLoose
): number | null {
  const v = row.id ?? row.Id ?? row.ID ?? row.userId ?? row.user_id ?? row.UserId;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  return null;
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
