/** Row from GET vivapi-user/user/b2b/agents (keys may vary). */
export type B2bAgentRow = Record<string, unknown>;

export const B2B_AGENT_PREFERRED_KEYS = [
  "userId",
  "user_id",
  "userName",
  "user_name",
  "firstName",
  "first_name",
  "lastName",
  "last_name",
  "email",
  "phone",
  "status",
  "userType",
  "user_type",
  "emailActivation",
  "email_activation",
  "createdOn",
  "created_on",
  "modifiedOn",
  "modified_on",
] as const;

const HIDDEN_KEYS_LC = new Set([
  "password",
  "pwd_token",
  "pwdtoken",
  "pwd_token_expiry",
  "token",
  "refresh_token",
]);

export function isB2bAgentHiddenColumn(key: string): boolean {
  return HIDDEN_KEYS_LC.has(key.toLowerCase());
}

export function formatB2bAgentStatus(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(String(value));
  if (Number.isFinite(n)) {
    if (n === 0) return "Pending (0)";
    if (n === 1) return "Active (1)";
    return String(n);
  }
  return String(value);
}
