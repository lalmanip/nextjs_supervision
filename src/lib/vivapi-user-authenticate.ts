/** vivapi-user POST /user/authenticate envelope. */
export type VivapiUserAuthenticateEnvelope = {
  status?: string;
  message?: string | null;
  response?: unknown;
  user?: unknown;
};

/** Returns an error message when authentication failed; null when status is success. */
export function getVivapiUserAuthenticateFailure(
  data: unknown
): string | null {
  if (!data || typeof data !== "object") {
    return "Invalid authentication response from user service";
  }
  const envelope = data as VivapiUserAuthenticateEnvelope;
  const status = String(envelope.status ?? "")
    .trim()
    .toLowerCase();
  if (status === "success") return null;

  const message = envelope.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  return "Invalid username or password";
}

export function extractVivapiUserAuthenticateUser(data: unknown): unknown {
  if (!data || typeof data !== "object") return null;
  const envelope = data as VivapiUserAuthenticateEnvelope;
  return envelope.response ?? envelope.user ?? null;
}
