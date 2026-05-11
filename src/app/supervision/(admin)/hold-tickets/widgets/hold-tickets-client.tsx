"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import { DataTable } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HOLD_TICKET_TABLE_COLUMNS,
  type HoldTicketRow,
} from "@/types/hold-ticket";

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
    Object.keys(row as object).forEach((k) => present.add(k));
  }

  const cols: ColumnDef<HoldTicketRow>[] = [];

  for (const { key, label } of HOLD_TICKET_TABLE_COLUMNS) {
    if (!present.has(key)) continue;
    cols.push({
      accessorKey: key,
      header: label,
      cell: ({ row }) => formatCell(row.getValue(key)),
    });
    present.delete(key);
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

  const columns = React.useMemo(() => buildHoldTicketColumns(rows), [rows]);

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
            <DataTable<HoldTicketRow, unknown>
              columns={columns}
              data={rows}
              searchPlaceholder="Search hold tickets..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
