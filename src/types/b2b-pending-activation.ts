/** Row from GET vivapi-user/user/b2b/pending-activation (keys may vary). */
export type B2bPendingActivationRow = Record<string, unknown>;

/** Preferred column order when keys exist on the API payload. */
export const B2B_PENDING_ACTIVATION_PREFERRED_KEYS = [
  "id",
  "userId",
  "user_id",
  "agencyName",
  "agency_name",
  "companyName",
  "company_name",
  "name",
  "email",
  "phone",
  "mobile",
  "city",
  "state",
  "country",
  "status",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
] as const;

const HIDDEN_KEYS_LC = new Set(["password", "token", "refresh_token"]);

export function isB2bPendingActivationHiddenColumn(key: string): boolean {
  return HIDDEN_KEYS_LC.has(key.toLowerCase());
}
