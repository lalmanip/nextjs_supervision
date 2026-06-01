import { z } from "zod";

/** Row from GET vivapi-user/user/b2b/wallet/requests/pending. */
export type B2bWalletRequestRow = Record<string, unknown>;

export const b2bWalletRequestReviewBodySchema = z.object({
  reviewedByUserId: z.coerce
    .number()
    .int()
    .positive("reviewedByUserId is required"),
  remarks: z.string().optional().default(""),
});

export type B2bWalletRequestReviewBody = z.infer<
  typeof b2bWalletRequestReviewBodySchema
>;

export const B2B_WALLET_REQUEST_PREFERRED_KEYS = [
  "requestId",
  "request_id",
  "id",
  "userOid",
  "user_oid",
  "userId",
  "user_id",
  "agencyName",
  "agency_name",
  "amount",
  "description",
  "appReference",
  "app_reference",
  "idempotencyKey",
  "idempotency_key",
  "status",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
] as const;

const HIDDEN_KEYS_LC = new Set(["password", "token", "refresh_token"]);

export function isB2bWalletRequestHiddenColumn(key: string): boolean {
  return HIDDEN_KEYS_LC.has(key.toLowerCase());
}
