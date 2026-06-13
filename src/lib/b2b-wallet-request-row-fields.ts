export type B2bWalletRequestLoose = Record<string, unknown>;

const REQUEST_ID_KEYS = [
  "requestId",
  "request_id",
  "RequestId",
  "Request_id",
  "id",
  "Id",
  "ID",
] as const;

export function getB2bWalletRequestId(row: B2bWalletRequestLoose): number | null {
  for (const key of REQUEST_ID_KEYS) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
  }
  return null;
}

export function walletRequestSummary(row: B2bWalletRequestLoose): string {
  const id = getB2bWalletRequestId(row);
  const amount =
    row.amount ?? row.Amount ?? row.requestedAmount ?? row.requested_amount;
  const userOid = row.userOid ?? row.user_oid ?? row.userId ?? row.user_id;
  const parts = [
    id != null ? `request ${id}` : null,
    amount != null ? `amount ${amount}` : null,
    userOid != null ? `user ${userOid}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "this request";
}
