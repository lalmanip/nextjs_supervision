"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import { DataTable } from "@/components/common/data-table";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { isoDateColumnSortingFn } from "@/lib/date-column-sort";
import { cn } from "@/lib/utils";
import {
  CANCELLED_TICKET_TABLE_COLUMNS,
  getCancelledTicketRowId,
  getRemarksValue,
  resolveRemarksFieldKey,
  type CancelledTicketRow,
} from "@/types/cancelled-ticket";

type ApiOk = {
  status: "success";
  cancelledTickets: CancelledTicketRow[];
  raw?: unknown;
};

type UpdateRemarksApiOk = {
  status: "success";
  ticket?: Record<string, unknown>;
};

type EditRemarksState = {
  rowId: string;
  ticketNumber: string;
  remarks: string;
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
  rows: CancelledTicketRow[],
  remarksKey: string | null,
  onEditRemarks: (row: CancelledTicketRow) => void
): ColumnDef<CancelledTicketRow>[] {
  if (rows.length === 0) return [];
  const present = new Set<string>();
  for (const row of rows) {
    Object.keys(row as object).forEach((k) => present.add(k));
  }

  const cols: ColumnDef<CancelledTicketRow>[] = [];
  const dateSort = isoDateColumnSortingFn<CancelledTicketRow>();

  for (const { keys, label } of CANCELLED_TICKET_TABLE_COLUMNS) {
    const found = keys.find((k) => present.has(k));
    if (!found) continue;
    const isIssueDate = label === "Issue date";
    const isRemarks = label === "Remarks";

    if (isRemarks && remarksKey) {
      cols.push({
        id: found,
        accessorKey: found as keyof CancelledTicketRow & string,
        header: label,
        cell: ({ row }) => {
          const text = getRemarksValue(row.original as Record<string, unknown>, remarksKey);
          const display = text.trim() ? text : "—";
          return (
            <div className="flex min-w-[12rem] max-w-xs items-start gap-2">
              <span className="flex-1 break-words text-sm">{display}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 px-2"
                onClick={() => onEditRemarks(row.original)}
                aria-label="Edit remarks"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      });
      present.delete(found);
      continue;
    }

    cols.push({
      id: found,
      accessorKey: found as keyof CancelledTicketRow & string,
      header: label,
      ...(isIssueDate ? { sortingFn: dateSort } : {}),
      cell: ({ row }) =>
        formatCell((row.original as Record<string, unknown>)[found]),
    });
    present.delete(found);
  }

  for (const key of [...present].sort()) {
    if (remarksKey && key === remarksKey) continue;
    cols.push({
      accessorKey: key as keyof CancelledTicketRow & string,
      header: formatHeader(key),
      cell: ({ row }) =>
        formatCell((row.original as Record<string, unknown>)[key]),
    });
  }

  cols.push({
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onEditRemarks(row.original)}
      >
        Edit remarks
      </Button>
    ),
  });

  return cols;
}

export default function CancelledTicketsClient() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<CancelledTicketRow[]>([]);
  const [rawFallback, setRawFallback] = React.useState<unknown>(null);
  const [editRemarks, setEditRemarks] = React.useState<EditRemarksState | null>(null);
  const [remarksDraft, setRemarksDraft] = React.useState("");
  const [savingRemarks, setSavingRemarks] = React.useState(false);

  const remarksKey = React.useMemo(
    () => resolveRemarksFieldKey(rows as Record<string, unknown>[]),
    [rows]
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<ApiOk>(
        "/api/supervision/flight-booking/cancelled-tickets"
      );
      setRows((data.cancelledTickets ?? []) as CancelledTicketRow[]);
      setRawFallback(
        data.cancelledTickets?.length === 0 && data.raw !== undefined
          ? data.raw
          : null
      );
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

  const openEditRemarks = React.useCallback(
    (row: CancelledTicketRow) => {
      const rowId = getCancelledTicketRowId(row as Record<string, unknown>);
      if (!rowId) {
        toast.error("This row has no id; cannot update remarks.");
        return;
      }
      const r = row as Record<string, unknown>;
      const ticketNumber = String(r.ticketNumber ?? r.ticket_number ?? rowId);
      setEditRemarks({
        rowId,
        ticketNumber,
        remarks: getRemarksValue(r, remarksKey),
      });
      setRemarksDraft(getRemarksValue(r, remarksKey));
    },
    [remarksKey]
  );

  const columns = React.useMemo(
    () => buildColumns(rows, remarksKey, openEditRemarks),
    [rows, remarksKey, openEditRemarks]
  );

  const saveRemarks = React.useCallback(async () => {
    if (!editRemarks) return;
    setSavingRemarks(true);
    try {
      const { data } = await http.put<UpdateRemarksApiOk>(
        `/api/supervision/flight-booking/cancelled-tickets/${editRemarks.rowId}/remarks`,
        { remarks: remarksDraft }
      );
      const updated = data.ticket;
      setRows((prev) =>
        prev.map((row) => {
          if (getCancelledTicketRowId(row as Record<string, unknown>) !== editRemarks.rowId) {
            return row;
          }
          if (updated && typeof updated === "object") {
            return { ...row, ...updated } as CancelledTicketRow;
          }
          if (remarksKey) {
            return { ...row, [remarksKey]: remarksDraft } as CancelledTicketRow;
          }
          return row;
        })
      );
      toast.success("Remarks updated");
      setEditRemarks(null);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setSavingRemarks(false);
    }
  }, [editRemarks, remarksDraft, remarksKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cancelled Tickets</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Flight tickets with cancelled status (vivapi-user).
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
          <CardTitle>Cancelled queue</CardTitle>
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
              <p>No cancelled tickets returned.</p>
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
            <DataTable<CancelledTicketRow, unknown>
              columns={columns}
              data={rows}
              searchPlaceholder="Search cancelled tickets..."
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={editRemarks !== null}
        onOpenChange={(open) => {
          if (!open && !savingRemarks) setEditRemarks(null);
        }}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Edit remarks</ModalTitle>
            <ModalDescription>
              {editRemarks
                ? `Ticket ${editRemarks.ticketNumber} (id ${editRemarks.rowId})`
                : null}
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancelled-ticket-remarks">Remarks</Label>
              <textarea
                id="cancelled-ticket-remarks"
                rows={4}
                value={remarksDraft}
                onChange={(e) => setRemarksDraft(e.target.value)}
                disabled={savingRemarks}
                placeholder="e.g. Refund processed on 19 May 2026"
                className={cn(
                  "flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm",
                  "placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-primary/45 focus-visible:border-primary/50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-500"
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={savingRemarks}
                onClick={() => setEditRemarks(null)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={savingRemarks} onClick={() => void saveRemarks()}>
                {savingRemarks ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
