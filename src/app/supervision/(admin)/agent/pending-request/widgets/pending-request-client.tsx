"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import { useAuthStore } from "@/features/auth/auth.store";
import { resolveSupervisionUserId } from "@/lib/supervision-user-id";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/common/modal";
import { DataTable } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getB2bWalletRequestId,
  walletRequestSummary,
} from "@/lib/b2b-wallet-request-row-fields";
import {
  B2B_WALLET_REQUEST_PREFERRED_KEYS,
  isB2bWalletRequestHiddenColumn,
  type B2bWalletRequestRow,
} from "@/types/b2b-wallet-request";

type ApiOk = {
  status: "success";
  walletRequests: B2bWalletRequestRow[];
  raw?: unknown;
};

type ActionApiOk = {
  status: "success";
  message: string | null;
};

type PendingAction = "approve" | "reject";

function formatHeader(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function buildColumns(
  rows: B2bWalletRequestRow[],
  options: {
    actingId: number | null;
    onApprove: (row: B2bWalletRequestRow) => void;
    onReject: (row: B2bWalletRequestRow) => void;
  }
): ColumnDef<B2bWalletRequestRow>[] {
  if (rows.length === 0) return [];

  const { actingId, onApprove, onReject } = options;

  const present = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => {
      if (!isB2bWalletRequestHiddenColumn(k)) present.add(k);
    });
  }

  const cols: ColumnDef<B2bWalletRequestRow>[] = [];
  const used = new Set<string>();

  for (const key of B2B_WALLET_REQUEST_PREFERRED_KEYS) {
    const found = [...present].find((k) => k.toLowerCase() === key.toLowerCase());
    if (!found) continue;
    used.add(found);
    cols.push({
      id: found,
      accessorKey: found,
      header: formatHeader(found),
      cell: ({ row }) => formatCell(row.original[found]),
    });
  }

  for (const key of [...present].filter((k) => !used.has(k)).sort()) {
    cols.push({
      accessorKey: key,
      header: formatHeader(key),
      cell: ({ row }) => formatCell(row.original[key]),
    });
  }

  cols.push({
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => {
      const requestId = getB2bWalletRequestId(row.original);
      const busy = actingId !== null && actingId === requestId;
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={requestId === null || actingId !== null}
            onClick={() => onApprove(row.original)}
          >
            {busy ? "Working…" : "Approve"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={requestId === null || actingId !== null}
            onClick={() => onReject(row.original)}
          >
            Reject
          </Button>
        </div>
      );
    },
  });

  return cols;
}

export default function PendingRequestClient() {
  const authUser = useAuthStore((s) => s.user);
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<B2bWalletRequestRow[]>([]);
  const [rawFallback, setRawFallback] = React.useState<unknown>(null);
  const [actingId, setActingId] = React.useState<number | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    action: PendingAction;
    row: B2bWalletRequestRow;
  } | null>(null);
  const [remarks, setRemarks] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<ApiOk>(
        "/api/supervision/user/b2b/wallet/requests/pending"
      );
      const list = data.walletRequests ?? [];
      setRows(list);
      setRawFallback(list.length === 0 && data.raw !== undefined ? data.raw : null);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
      setRows([]);
      setRawFallback(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runAction = React.useCallback(
    async (
      action: PendingAction,
      row: B2bWalletRequestRow,
      payload: { reviewedByUserId: number; remarks: string }
    ) => {
      const requestId = getB2bWalletRequestId(row);
      if (requestId === null) {
        toast.error("Row is missing a request id.");
        return;
      }
      if (!payload.reviewedByUserId || payload.reviewedByUserId <= 0) {
        toast.error("Logged-in user id is unavailable. Sign in again.");
        return;
      }
      setActingId(requestId);
      setSubmitting(true);
      try {
        const { data } = await http.post<ActionApiOk>(
          `/api/supervision/user/b2b/wallet/requests/${encodeURIComponent(
            String(requestId)
          )}/${action}`,
          {
            reviewedByUserId: payload.reviewedByUserId,
            remarks: payload.remarks.trim(),
          }
        );
        toast.success(
          data.message?.trim() ||
            (action === "approve" ? "Request approved" : "Request rejected")
        );
        setConfirmAction(null);
        setRemarks("");
        await load();
      } catch (e) {
        toast.error(getApiErrorMessage(e));
        throw e;
      } finally {
        setActingId(null);
        setSubmitting(false);
      }
    },
    [load]
  );

  const openReview = React.useCallback(
    (action: PendingAction, row: B2bWalletRequestRow) => {
      setRemarks("");
      setConfirmAction({ action, row });
    },
    []
  );

  const onApprove = React.useCallback(
    (row: B2bWalletRequestRow) => openReview("approve", row),
    [openReview]
  );

  const onReject = React.useCallback(
    (row: B2bWalletRequestRow) => openReview("reject", row),
    [openReview]
  );

  const columns = React.useMemo(
    () => buildColumns(rows, { actingId, onApprove, onReject }),
    [rows, actingId, onApprove, onReject]
  );

  const confirmRow = confirmAction?.row ?? null;
  const confirmKind = confirmAction?.action ?? "approve";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pending Request</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Review and approve or reject pending B2B wallet requests from agents.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || actingId !== null}
          onClick={() => void load()}
          className="shrink-0"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Pending requests</CardTitle>
          {!loading ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {rows.length} record{rows.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p>No pending wallet requests returned.</p>
              {rawFallback !== null ? (
                <details className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-200">
                    Raw response (debug)
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(rawFallback, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          ) : (
            <DataTable<B2bWalletRequestRow, unknown>
              columns={columns}
              data={rows}
              searchPlaceholder="Search pending requests..."
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setConfirmAction(null);
            setRemarks("");
          }
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {confirmKind === "approve" ? "Approve request" : "Reject request"}
            </ModalTitle>
            <ModalDescription>
              {confirmRow
                ? confirmKind === "approve"
                  ? `Approve ${walletRequestSummary(confirmRow)}? This will apply the wallet change.`
                  : `Reject ${walletRequestSummary(confirmRow)}?`
                : null}
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="walletRequestRemarks">Remarks</Label>
              <textarea
                id="walletRequestRemarks"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={submitting}
                placeholder={
                  confirmKind === "approve"
                    ? "Verified bank receipt"
                    : "Reason for rejection"
                }
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  setConfirmAction(null);
                  setRemarks("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmKind === "reject" ? "destructive" : "default"}
                disabled={submitting}
                onClick={() => {
                  if (!confirmAction) return;
                  const reviewerId = resolveSupervisionUserId(authUser);
                  void runAction(confirmAction.action, confirmAction.row, {
                    reviewedByUserId: reviewerId ?? 0,
                    remarks,
                  });
                }}
              >
                {submitting
                  ? "Working…"
                  : confirmKind === "approve"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
