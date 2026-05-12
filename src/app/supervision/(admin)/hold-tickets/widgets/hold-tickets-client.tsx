"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HOLD_TICKET_TABLE_COLUMNS,
  isHoldTicketHiddenColumn,
  type HoldTicketRow,
} from "@/types/hold-ticket";
import type { TboReleasePnrUpstream } from "@/types/tbo-release-pnr";
import {
  getHoldTicketReleaseFields,
  getHoldTicketRowId,
  type HoldTicketLoose,
} from "@/lib/hold-ticket-row-fields";
import { holdTicketLastTicketDateSortingFn } from "@/lib/hold-ticket-sort";

type ApiOk = {
  status: "success";
  /** Parsed from API `{ response: HoldTicketRow[], status, message }` */
  holdTickets: HoldTicketRow[];
  raw?: unknown;
};

function formatHeader(key: string): string {
  return key
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

function buildHoldTicketColumns(rows: HoldTicketRow[]): ColumnDef<HoldTicketRow>[] {
  if (rows.length === 0) return [];
  const present = new Set<string>();
  for (const row of rows) {
    Object.keys(row as object).forEach((k) => {
      if (!isHoldTicketHiddenColumn(k)) present.add(k);
    });
  }

  const cols: ColumnDef<HoldTicketRow>[] = [];

  for (const { keys, label } of HOLD_TICKET_TABLE_COLUMNS) {
    const found = keys.find((k) => present.has(k));
    if (!found) continue;
    const isLastTicketDate = label === "Last Ticket Date";
    cols.push({
      id: found,
      accessorKey: found as keyof HoldTicketRow & string,
      header: label,
      ...(isLastTicketDate ? { sortingFn: holdTicketLastTicketDateSortingFn } : {}),
      cell: ({ row }) =>
        formatCell((row.original as Record<string, unknown>)[found]),
    });
    present.delete(found);
  }

  for (const key of [...present].sort()) {
    cols.push({
      accessorKey: key as keyof HoldTicketRow & string,
      header: formatHeader(key),
      cell: ({ row }) =>
        formatCell((row.original as Record<string, unknown>)[key]),
    });
  }

  return cols;
}

type ReleasePnrApiOk = {
  status: "success";
  data?: TboReleasePnrUpstream;
};

function interpretReleaseUpstream(upstream: TboReleasePnrUpstream | undefined): {
  ok: boolean;
  message: string;
} {
  if (!upstream) {
    return { ok: true, message: "Release request completed." };
  }
  const inner = upstream.Response ?? upstream.response;
  if (!inner) {
    return { ok: true, message: "Release request completed." };
  }
  const status = inner.ResponseStatus;
  const errCode = inner.Error?.ErrorCode;
  const errMsg = inner.Error?.ErrorMessage?.trim();
  const businessOk =
    status === 1 && (errCode === undefined || errCode === 0);
  if (businessOk) {
    return {
      ok: true,
      message: errMsg ? `Released: ${errMsg}` : "PNR released successfully.",
    };
  }
  return {
    ok: false,
    message:
      errMsg ||
      (status !== undefined
        ? `Release failed (ResponseStatus: ${status}).`
        : "Release failed."),
  };
}

function releaseConfirmDescription(row: HoldTicketRow): string {
  const f = getHoldTicketReleaseFields(row as HoldTicketLoose);
  return `Call release-pnr for PNR ${f.pnr || "—"} (booking ${f.bookingId || "—"}, source ${f.source || "—"})?`;
}

export default function HoldTicketsClient() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<HoldTicketRow[]>([]);
  const [rawFallback, setRawFallback] = React.useState<unknown>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<ApiOk>("/api/supervision/flight-booking/hold-tickets");
      setRows(data.holdTickets ?? []);
      setRawFallback(
        data.holdTickets?.length === 0 && data.raw !== undefined ? data.raw : null
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

  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
  const [releaseRow, setReleaseRow] = React.useState<HoldTicketRow | null>(null);

  const selectedRow = React.useMemo(
    () =>
      rows.find((r) => getHoldTicketRowId(r as HoldTicketLoose) === selectedRowId) ??
      null,
    [rows, selectedRowId]
  );

  React.useEffect(() => {
    if (selectedRowId === null) return;
    if (!rows.some((r) => getHoldTicketRowId(r as HoldTicketLoose) === selectedRowId)) {
      setSelectedRowId(null);
    }
  }, [rows, selectedRowId]);

  const baseColumns = React.useMemo(() => buildHoldTicketColumns(rows), [rows]);

  const columns = React.useMemo<ColumnDef<HoldTicketRow>[]>(() => {
    if (baseColumns.length === 0) return [];
    const selectColumn: ColumnDef<HoldTicketRow> = {
      id: "select",
      header: () => <span className="sr-only">Select row</span>,
      cell: ({ row }) => {
        const rid = getHoldTicketRowId(row.original as HoldTicketLoose);
        const pnr = getHoldTicketReleaseFields(row.original as HoldTicketLoose).pnr;
        return (
          <div className="flex justify-center px-1">
            <input
              type="radio"
              name="hold-ticket-selection"
              className="h-4 w-4 cursor-pointer accent-primary"
              checked={selectedRowId === rid && rid !== ""}
              onChange={() => setSelectedRowId(rid || null)}
              aria-label={pnr ? `Select PNR ${pnr}` : "Select row"}
            />
          </div>
        );
      },
      enableSorting: false,
    };
    return [selectColumn, ...baseColumns];
  }, [baseColumns, selectedRowId]);

  const confirmRelease = React.useCallback(async () => {
    if (!releaseRow) return;
    const row = releaseRow as HoldTicketLoose;
    const { bookingId, source, pnr } = getHoldTicketReleaseFields(row);
    try {
      const { data } = await http.post<ReleasePnrApiOk>(
        "/api/supervision/flight/tbo/release-pnr",
        {
          BookingId: bookingId,
          Source: source,
        }
      );
      const { ok, message } = interpretReleaseUpstream(data.data);
      if (!ok) {
        throw new Error(message);
      }
      toast.success(message, { description: `PNR ${pnr || "—"} · booking ${bookingId}` });
      setSelectedRowId(null);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
      throw e;
    }
  }, [releaseRow, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hold Tickets</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Flight bookings currently on hold (live data from vivapi-user).
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
          <CardTitle>Hold queue</CardTitle>
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
              <p>No hold tickets returned, or the API shape could not be mapped to rows.</p>
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
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Select a booking with the radio control, then run an action.
                </p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedRow}
                    onClick={() => {
                      if (!selectedRow) return;
                      const f = getHoldTicketReleaseFields(selectedRow as HoldTicketLoose);
                      if (!f.bookingId || !f.source) {
                        toast.error("Selected row is missing booking id or source.");
                        return;
                      }
                      setReleaseRow(selectedRow);
                    }}
                  >
                    Release PNR
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!selectedRow}
                    onClick={() => {
                      if (!selectedRow) return;
                      const f = getHoldTicketReleaseFields(selectedRow as HoldTicketLoose);
                      toast.info("Get Ticket is not wired to an API yet.", {
                        description: `PNR ${f.pnr || "—"} · booking ${f.bookingId || "—"}`,
                      });
                    }}
                  >
                    Get Ticket
                  </Button>
                </div>
              </div>
              <DataTable<HoldTicketRow, unknown>
                columns={columns}
                data={rows}
                searchPlaceholder="Search hold tickets..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={releaseRow !== null}
        title="Release PNR"
        description={releaseRow ? releaseConfirmDescription(releaseRow) : undefined}
        confirmText="Release"
        destructive
        onOpenChange={(open) => {
          if (!open) setReleaseRow(null);
        }}
        onConfirm={confirmRelease}
      />
    </div>
  );
}
