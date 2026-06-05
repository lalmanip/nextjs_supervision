"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import { useAuthStore } from "@/features/auth/auth.store";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/common/modal";
import { DataTable } from "@/components/common/data-table";
import { EditableStatusCell } from "@/components/common/editable-status-cell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatB2bActivationStatus,
  getB2bPendingActivationRowId,
  getB2bPendingActivationStatus,
  getB2bPendingActivationUserOid,
  isB2bApprovedStatus,
  isB2bPendingActivationStatusColumn,
  pendingActivationSummary,
} from "@/lib/b2b-pending-activation-row-fields";
import {
  B2B_PENDING_ACTIVATION_PREFERRED_KEYS,
  isB2bPendingActivationHiddenColumn,
  type B2bPendingActivationRow,
} from "@/types/b2b-pending-activation";
import type { B2bWalletSnapshot } from "@/types/b2b-wallet-initialize";
import { AgentRegistrationReviewModal } from "@/components/agent/agent-registration-review-modal";

const AWAITING_WALLET_STORAGE_KEY = "supervision.b2bAwaitingWalletInit";

type ApiOk = {
  status: "success";
  pendingActivations: B2bPendingActivationRow[];
  raw?: unknown;
};

type SaveStatusApiOk = {
  status: "success";
};

type InitializeApiOk = {
  status: "success";
  wallet: B2bWalletSnapshot;
  message: string | null;
};

type TableMode = "pending" | "awaiting-wallet";

type BuildColumnOptions = {
  mode: TableMode;
  statusEditingId: number | null;
  savingStatus: boolean;
  initializingUserOid: number | null;
  onEditStatus: (id: number) => void;
  onCancelStatus: () => void;
  onSaveStatus: (id: number, status: string) => void;
  onInitialize: (row: B2bPendingActivationRow) => void;
  onDismissAwaiting?: (userOid: number) => void;
  onReview?: (row: B2bPendingActivationRow) => void;
};

function parseAwaitingRows(raw: string): B2bPendingActivationRow[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((r) => r && typeof r === "object") as B2bPendingActivationRow[];
}

function loadAwaitingFromStorage(): B2bPendingActivationRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AWAITING_WALLET_STORAGE_KEY);
    if (raw) return parseAwaitingRows(raw);

    const legacy = window.sessionStorage.getItem(AWAITING_WALLET_STORAGE_KEY);
    if (!legacy) return [];
    const rows = parseAwaitingRows(legacy);
    if (rows.length > 0) {
      window.localStorage.setItem(AWAITING_WALLET_STORAGE_KEY, legacy);
      window.sessionStorage.removeItem(AWAITING_WALLET_STORAGE_KEY);
    }
    return rows;
  } catch {
    return [];
  }
}

function saveAwaitingToStorage(rows: B2bPendingActivationRow[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AWAITING_WALLET_STORAGE_KEY, JSON.stringify(rows));
}

function rowIdentityKey(row: B2bPendingActivationRow): string {
  const oid = getB2bPendingActivationUserOid(row);
  const id = getB2bPendingActivationRowId(row);
  return oid != null ? `oid:${oid}` : id != null ? `id:${id}` : JSON.stringify(row);
}

function upsertAwaitingRow(
  rows: B2bPendingActivationRow[],
  row: B2bPendingActivationRow
): B2bPendingActivationRow[] {
  const key = rowIdentityKey(row);
  const next = rows.filter((r) => rowIdentityKey(r) !== key);
  next.unshift(row);
  return next;
}

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

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(n);
}

function buildColumns(
  rows: B2bPendingActivationRow[],
  options: BuildColumnOptions
): ColumnDef<B2bPendingActivationRow>[] {
  if (rows.length === 0) return [];

  const {
    mode,
    statusEditingId,
    savingStatus,
    initializingUserOid,
    onEditStatus,
    onCancelStatus,
    onSaveStatus,
    onInitialize,
    onDismissAwaiting,
    onReview,
  } = options;

  const present = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => {
      if (!isB2bPendingActivationHiddenColumn(k)) present.add(k);
    });
  }

  const cols: ColumnDef<B2bPendingActivationRow>[] = [];
  const used = new Set<string>();

  const statusCell = (row: B2bPendingActivationRow, rowId: number): React.ReactNode => {
    const status = getB2bPendingActivationStatus(row);
    if (mode === "awaiting-wallet") {
      return (
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {formatB2bActivationStatus(status)}
        </span>
      );
    }
    return (
      <EditableStatusCell
        status={status}
        isEditing={statusEditingId === rowId}
        saving={savingStatus}
        onStartEdit={() => onEditStatus(rowId)}
        onCancel={onCancelStatus}
        onSave={(value) => onSaveStatus(rowId, value)}
      />
    );
  };

  for (const key of B2B_PENDING_ACTIVATION_PREFERRED_KEYS) {
    const found = [...present].find((k) => k.toLowerCase() === key.toLowerCase());
    if (!found) continue;
    used.add(found);
    const isStatus = isB2bPendingActivationStatusColumn(found);
    cols.push({
      id: found,
      accessorKey: found,
      header: isStatus ? "Status" : formatHeader(found),
      cell: ({ row }) => {
        const rowId = getB2bPendingActivationRowId(row.original);
        if (isStatus && rowId !== null) return statusCell(row.original, rowId);
        return formatCell(row.original[found]);
      },
    });
  }

  for (const key of [...present].filter((k) => !used.has(k)).sort()) {
    const isStatus = isB2bPendingActivationStatusColumn(key);
    cols.push({
      accessorKey: key,
      header: isStatus ? "Status" : formatHeader(key),
      cell: ({ row }) => {
        const rowId = getB2bPendingActivationRowId(row.original);
        if (isStatus && rowId !== null) return statusCell(row.original, rowId);
        return formatCell(row.original[key]);
      },
    });
  }

  const hasStatusCol = cols.some((c) => c.header === "Status");
  if (!hasStatusCol) {
    cols.push({
      id: "status",
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => {
        const rowId = getB2bPendingActivationRowId(row.original);
        if (rowId === null) return "—";
        return statusCell(row.original, rowId);
      },
    });
  }

  if (mode === "pending" && onReview) {
    cols.push({
      id: "review",
      header: "Review",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onReview(row.original)}
        >
          View &amp; approve
        </Button>
      ),
    });
  }

  cols.push({
    id: "wallet",
    header: "Wallet",
    enableSorting: false,
    cell: ({ row }) => {
      const userOid = getB2bPendingActivationUserOid(row.original);
      const busy =
        initializingUserOid !== null && initializingUserOid === userOid;
      const status = getB2bPendingActivationStatus(row.original);
      const canInit =
        mode === "awaiting-wallet" || isB2bApprovedStatus(status);

      if (!canInit && mode === "pending") {
        return (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Approve first
          </span>
        );
      }

      return (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={userOid === null || initializingUserOid !== null}
            onClick={() => onInitialize(row.original)}
          >
            {busy ? "Initializing…" : "Initialize wallet"}
          </Button>
          {mode === "awaiting-wallet" && onDismissAwaiting && userOid !== null ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={initializingUserOid !== null}
              onClick={() => onDismissAwaiting(userOid)}
            >
              Dismiss
            </Button>
          ) : null}
        </div>
      );
    },
  });

  return cols;
}

export default function NewRegistrationClient() {
  const authUser = useAuthStore((s) => s.user);
  const [loading, setLoading] = React.useState(true);
  const [pendingRows, setPendingRows] = React.useState<B2bPendingActivationRow[]>([]);
  const [awaitingWalletRows, setAwaitingWalletRows] = React.useState<
    B2bPendingActivationRow[]
  >(loadAwaitingFromStorage);
  const [rawFallback, setRawFallback] = React.useState<unknown>(null);
  const [statusEditingId, setStatusEditingId] = React.useState<number | null>(null);
  const [savingStatus, setSavingStatus] = React.useState(false);
  const [initRow, setInitRow] = React.useState<B2bPendingActivationRow | null>(null);
  const [initializingUserOid, setInitializingUserOid] = React.useState<number | null>(
    null
  );
  const [initialBalance, setInitialBalance] = React.useState(0);
  const [initialCreditLimit, setInitialCreditLimit] = React.useState(200000);
  const [currencyConverterFk, setCurrencyConverterFk] = React.useState(1);
  const [performedByUserId, setPerformedByUserId] = React.useState<number>(
    authUser?.userId ?? 1
  );
  const [lastWallet, setLastWallet] = React.useState<B2bWalletSnapshot | null>(null);
  const [reviewRow, setReviewRow] = React.useState<B2bPendingActivationRow | null>(null);
  const awaitingWalletHydrated = React.useRef(false);

  React.useEffect(() => {
    if (!awaitingWalletHydrated.current) {
      awaitingWalletHydrated.current = true;
      return;
    }
    saveAwaitingToStorage(awaitingWalletRows);
  }, [awaitingWalletRows]);

  React.useEffect(() => {
    if (authUser?.userId) {
      setPerformedByUserId(authUser.userId);
    }
  }, [authUser?.userId]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<ApiOk>(
        "/api/supervision/user/b2b/pending-activation"
      );
      const list = data.pendingActivations ?? [];
      setPendingRows(list);
      setRawFallback(list.length === 0 && data.raw !== undefined ? data.raw : null);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
      setPendingRows([]);
      setRawFallback(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const cancelStatusEdit = React.useCallback(() => {
    setStatusEditingId(null);
    setSavingStatus(false);
  }, []);

  const removeFromAwaiting = React.useCallback((userOid: number) => {
    setAwaitingWalletRows((prev) =>
      prev.filter((r) => getB2bPendingActivationUserOid(r) !== userOid)
    );
  }, []);

  const onSaveStatus = React.useCallback(
    async (id: number, status: string) => {
      if (savingStatus) return;
      const row = pendingRows.find((r) => getB2bPendingActivationRowId(r) === id);
      if (!row) return;

      setSavingStatus(true);
      try {
        await http.put<SaveStatusApiOk>(
          `/api/supervision/user/update/${encodeURIComponent(String(id))}`,
          { status }
        );

        if (isB2bApprovedStatus(status)) {
          const approvedRow = {
            ...row,
            status,
            Status: status,
          };
          setAwaitingWalletRows((prev) => upsertAwaitingRow(prev, approvedRow));
          toast.success("Approved — initialize wallet in the section below.");
        } else {
          toast.success("Status updated");
        }

        cancelStatusEdit();
        await load();
      } catch (e) {
        toast.error(getApiErrorMessage(e));
      } finally {
        setSavingStatus(false);
      }
    },
    [cancelStatusEdit, load, pendingRows, savingStatus]
  );

  const openInitialize = React.useCallback(
    (row: B2bPendingActivationRow) => {
      setInitialBalance(0);
      setInitialCreditLimit(200000);
      setCurrencyConverterFk(1);
      if (authUser?.userId) {
        setPerformedByUserId(authUser.userId);
      }
      setInitRow(row);
    },
    [authUser?.userId]
  );

  const submitInitialize = React.useCallback(async () => {
    if (!initRow) return;
    const userOid = getB2bPendingActivationUserOid(initRow);
    if (userOid === null) {
      toast.error("Row is missing user OID.");
      return;
    }
    if (performedByUserId <= 0) {
      toast.error("Performed-by user id is required.");
      return;
    }
    if (currencyConverterFk <= 0) {
      toast.error("Currency converter FK must be greater than 0.");
      return;
    }

    setInitializingUserOid(userOid);
    try {
      const { data } = await http.post<InitializeApiOk>(
        `/api/supervision/user/b2b/wallet/${encodeURIComponent(
          String(userOid)
        )}/initialize`,
        {
          initialBalance,
          initialCreditLimit,
          currencyConverterFk,
          performedByUserId,
        }
      );
      setLastWallet(data.wallet);
      removeFromAwaiting(userOid);
      toast.success(data.message?.trim() || "Wallet initialized");
      setInitRow(null);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
      throw e;
    } finally {
      setInitializingUserOid(null);
    }
  }, [
    initRow,
    initialBalance,
    initialCreditLimit,
    currencyConverterFk,
    performedByUserId,
    load,
    removeFromAwaiting,
  ]);

  const openReview = React.useCallback((row: B2bPendingActivationRow) => {
    setReviewRow(row);
  }, []);

  const reviewUserOid = reviewRow ? getB2bPendingActivationUserOid(reviewRow) : null;
  const reviewRowId = reviewRow ? getB2bPendingActivationRowId(reviewRow) : null;

  const approveFromReview = React.useCallback(async () => {
    if (reviewRowId === null) return;
    await onSaveStatus(reviewRowId, "1");
    setReviewRow(null);
  }, [onSaveStatus, reviewRowId]);

  const columnOptions: BuildColumnOptions = {
    mode: "pending",
    statusEditingId,
    savingStatus,
    initializingUserOid,
    onEditStatus: setStatusEditingId,
    onCancelStatus: cancelStatusEdit,
    onSaveStatus,
    onInitialize: openInitialize,
    onReview: openReview,
  };

  const pendingColumns = React.useMemo(
    () => buildColumns(pendingRows, { ...columnOptions, mode: "pending" }),
    [pendingRows, columnOptions]
  );

  const awaitingColumns = React.useMemo(
    () =>
      buildColumns(awaitingWalletRows, {
        ...columnOptions,
        mode: "awaiting-wallet",
        onDismissAwaiting: removeFromAwaiting,
      }),
    [awaitingWalletRows, columnOptions, removeFromAwaiting]
  );

  const initUserOid = initRow ? getB2bPendingActivationUserOid(initRow) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Registration</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Approve agents (status → 1), then initialize their wallet in the awaiting
            section. Approved rows stay visible until the wallet is created.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || initializingUserOid !== null}
          onClick={() => void load()}
          className="shrink-0"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {lastWallet ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Last initialized balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(lastWallet.balance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Credit limit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(lastWallet.creditLimit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Available to book
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(lastWallet.availableToBook)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                User OID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{lastWallet.userOid}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Pending approval</CardTitle>
          {!loading ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {pendingRows.length} record{pendingRows.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full max-w-sm" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : pendingRows.length === 0 ? (
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p>No registrations awaiting approval.</p>
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
            <DataTable<B2bPendingActivationRow, unknown>
              columns={pendingColumns}
              data={pendingRows}
              searchPlaceholder="Search pending registrations..."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Awaiting wallet initialization</CardTitle>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {awaitingWalletRows.length} record{awaitingWalletRows.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent>
          {awaitingWalletRows.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Approved agents appear here until their wallet is initialized. Approve a
              registration above to move it into this queue.
            </p>
          ) : (
            <DataTable<B2bPendingActivationRow, unknown>
              columns={awaitingColumns}
              data={awaitingWalletRows}
              searchPlaceholder="Search awaiting wallet setup..."
            />
          )}
        </CardContent>
      </Card>

      <AgentRegistrationReviewModal
        open={reviewRow !== null}
        userOid={reviewUserOid}
        summaryLabel={reviewRow ? pendingActivationSummary(reviewRow) : ""}
        canApprove
        approving={savingStatus}
        onClose={() => setReviewRow(null)}
        onApprove={() => void approveFromReview()}
      />

      <Modal
        open={initRow !== null}
        onOpenChange={(open) => {
          if (!open && initializingUserOid === null) {
            setInitRow(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Initialize wallet</ModalTitle>
            <ModalDescription>
              {initRow
                ? `Create the B2B wallet for ${pendingActivationSummary(initRow)}${
                    initUserOid != null ? ` (OID ${initUserOid})` : ""
                  }.`
                : null}
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="initialBalance">Initial balance</Label>
              <Input
                id="initialBalance"
                type="number"
                min={0}
                step="0.01"
                value={initialBalance}
                onChange={(e) => setInitialBalance(Number(e.target.value) || 0)}
                disabled={initializingUserOid !== null}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialCreditLimit">Initial credit limit</Label>
              <Input
                id="initialCreditLimit"
                type="number"
                min={0}
                step="0.01"
                value={initialCreditLimit}
                onChange={(e) =>
                  setInitialCreditLimit(Number(e.target.value) || 0)
                }
                disabled={initializingUserOid !== null}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currencyConverterFk">Currency converter FK</Label>
              <Input
                id="currencyConverterFk"
                type="number"
                min={1}
                value={currencyConverterFk}
                onChange={(e) =>
                  setCurrencyConverterFk(Number(e.target.value) || 0)
                }
                disabled={initializingUserOid !== null}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walletPerformedByUserId">Performed by user ID</Label>
              <Input
                id="walletPerformedByUserId"
                type="number"
                min={1}
                value={performedByUserId}
                onChange={(e) =>
                  setPerformedByUserId(Number(e.target.value) || 0)
                }
                disabled={initializingUserOid !== null}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={initializingUserOid !== null}
                onClick={() => setInitRow(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  initializingUserOid !== null ||
                  initUserOid === null ||
                  performedByUserId <= 0 ||
                  currencyConverterFk <= 0
                }
                onClick={() => void submitInitialize()}
              >
                {initializingUserOid !== null ? "Initializing…" : "Initialize wallet"}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
