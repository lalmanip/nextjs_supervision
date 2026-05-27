export type B2cEnquiryLoose = Record<string, unknown>;

const ADMIN_NOTES_KEYS = [
  "adminNotes",
  "admin_notes",
  "Admin_Notes",
  "AdminNotes",
] as const;

const STATUS_KEYS = ["status", "Status"] as const;

export function getB2cEnquiryRowId(row: B2cEnquiryLoose): number | null {
  const v = row.id ?? row.Id ?? row.ID;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  return null;
}

export function isB2cEnquiryAdminNotesColumn(key: string): boolean {
  const lower = key.toLowerCase();
  return ADMIN_NOTES_KEYS.some((k) => k.toLowerCase() === lower);
}

export function isB2cEnquiryStatusColumn(key: string): boolean {
  const lower = key.toLowerCase();
  return STATUS_KEYS.some((k) => k.toLowerCase() === lower);
}

export function getB2cEnquiryAdminNotes(row: B2cEnquiryLoose): string | null {
  for (const key of ADMIN_NOTES_KEYS) {
    const v = row[key];
    if (typeof v === "string") return v;
    if (v === null) return null;
  }
  return null;
}

export function getB2cEnquiryStatus(row: B2cEnquiryLoose): string | null {
  for (const key of STATUS_KEYS) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v === null) return null;
  }
  return null;
}
