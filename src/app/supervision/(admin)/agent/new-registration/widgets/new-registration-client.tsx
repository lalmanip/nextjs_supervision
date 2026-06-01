"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import { DataTable } from "@/components/common/data-table";
import { EditableStatusCell } from "@/components/common/editable-status-cell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getB2bPendingActivationRowId,
  getB2bPendingActivationStatus,
  isB2bPendingActivationStatusColumn,
} from "@/lib/b2b-pending-activation-row-fields";
import {
  B2B_PENDING_ACTIVATION_PREFERRED_KEYS,
  isB2bPendingActivationHiddenColumn,
  type B2bPendingActivationRow,
} from "@/types/b2b-pending-activation";

type ApiOk = {
  status: "success";
  pendingActivations: B2bPendingActivationRow[];
  raw?: unknown;
};

type SaveStatusApiOk = {
  status: "success";
};

type StatusEditOptions = {
  editingId: number | null;
  saving: boolean;
  onEdit: (id: number) => void;
  onCancel: () => void;
  onSave: (id: number, status: string) => void;
};

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
  rows: B2bPendingActivationRow[],
  statusEdit?: StatusEditOptions
): ColumnDef<B2bPendingActivationRow>[] {
  if (rows.length === 0) return [];

  const present = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => {
      if (!isB2bPendingActivationHiddenColumn(k)) present.add(k);
    });
  }

  const cols: ColumnDef<B2bPendingActivationRow>[] = [];
  const used = new Set<string>();

  const statusCell = (row: B2bPendingActivationRow, rowId: number): React.ReactNode => {
    if (!statusEdit) {
      return formatCell(getB2bPendingActivationStatus(row));
    }
    return (
      <EditableStatusCell
        status={getB2bPendingActivationStatus(row)}
        isEditing={statusEdit.editingId === rowId}
        saving={statusEdit.saving}
        onStartEdit={() => statusEdit.onEdit(rowId)}
        onCancel={statusEdit.onCancel}
        onSave={(value) => statusEdit.onSave(rowId, value)}
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
  if (statusEdit && !hasStatusCol) {
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

  return cols;
}

export default function NewRegistrationClient() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<B2bPendingActivationRow[]>([]);
  const [rawFallback, setRawFallback] = React.useState<unknown>(null);
  const [statusEditingId, setStatusEditingId] = React.useState<number | null>(null);
  const [savingStatus, setSavingStatus] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<ApiOk>(
        "/api/supervision/user/b2b/pending-activation"
      );
      const list = data.pendingActivations ?? [];
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

  const cancelStatusEdit = React.useCallback(() => {
    setStatusEditingId(null);
    setSavingStatus(false);
  }, []);

  const onSaveStatus = React.useCallback(
    async (id: number, status: string) => {
      if (savingStatus) return;
      setSavingStatus(true);
      try {
        await http.put<SaveStatusApiOk>(
          `/api/supervision/user/update/${encodeURIComponent(String(id))}`,
          { status }
        );
        toast.success("Status updated");
        cancelStatusEdit();
        await load();
      } catch (e) {
        toast.error(getApiErrorMessage(e));
        setSavingStatus(false);
      }
    },
    [cancelStatusEdit, load, savingStatus]
  );

  const columns = React.useMemo(
    () =>
      buildColumns(rows, {
        editingId: statusEditingId,
        saving: savingStatus,
        onEdit: setStatusEditingId,
        onCancel: cancelStatusEdit,
        onSave: onSaveStatus,
      }),
    [rows, statusEditingId, savingStatus, cancelStatusEdit, onSaveStatus]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Registration</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            B2B agents pending activation (vivapi-user).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void load()}
          className="shrink-0"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Pending activation</CardTitle>
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
              <p>No pending activations returned, or the API shape could not be mapped to rows.</p>
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
              columns={columns}
              data={rows}
              searchPlaceholder="Search pending registrations..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
