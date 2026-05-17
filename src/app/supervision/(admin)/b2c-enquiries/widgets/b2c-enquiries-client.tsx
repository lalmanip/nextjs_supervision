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
import { isoDateColumnSortingFn } from "@/lib/date-column-sort";
import {
  B2C_ENQUIRY_TABLE_COLUMNS,
  type B2cEnquiryRow,
} from "@/types/b2c-enquiry";

type ApiOk = {
  status: "success";
  enquiries: B2cEnquiryRow[];
  raw?: unknown;
};

const MESSAGE_PREVIEW = 160;

function formatHeader(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatCell(key: string, v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (key.toLowerCase().includes("message") && s.length > MESSAGE_PREVIEW) {
    return `${s.slice(0, MESSAGE_PREVIEW)}…`;
  }
  return s;
}

function buildColumns(rows: B2cEnquiryRow[]): ColumnDef<B2cEnquiryRow>[] {
  if (rows.length === 0) return [];
  const present = new Set<string>();
  for (const row of rows) {
    Object.keys(row as object).forEach((k) => present.add(k));
  }

  const cols: ColumnDef<B2cEnquiryRow>[] = [];
  const dateSort = isoDateColumnSortingFn<B2cEnquiryRow>();

  for (const { keys, label } of B2C_ENQUIRY_TABLE_COLUMNS) {
    const found = keys.find((k) => present.has(k));
    if (!found) continue;
    const isEnqDate = label === "Enquiry date";
    cols.push({
      id: found,
      accessorKey: found as keyof B2cEnquiryRow & string,
      header: label,
      ...(isEnqDate ? { sortingFn: dateSort } : {}),
      cell: ({ row }) =>
        formatCell(found, (row.original as Record<string, unknown>)[found]),
    });
    present.delete(found);
  }

  for (const key of [...present].sort()) {
    cols.push({
      accessorKey: key as keyof B2cEnquiryRow & string,
      header: formatHeader(key),
      cell: ({ row }) =>
        formatCell(key, (row.original as Record<string, unknown>)[key]),
    });
  }

  return cols;
}

export default function B2cEnquiriesClient() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<B2cEnquiryRow[]>([]);
  const [rawFallback, setRawFallback] = React.useState<unknown>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<ApiOk>("/api/supervision/b2c-enquiry");
      setRows((data.enquiries ?? []) as B2cEnquiryRow[]);
      setRawFallback(
        data.enquiries?.length === 0 && data.raw !== undefined ? data.raw : null
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

  const columns = React.useMemo(() => buildColumns(rows), [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">B2C Enquiry</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Customer enquiries submitted through B2C channels (vivapi-user).
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
          <CardTitle>All enquiries</CardTitle>
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
              <p>No B2C enquiries returned.</p>
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
            <DataTable<B2cEnquiryRow, unknown>
              columns={columns}
              data={rows}
              searchPlaceholder="Search enquiries..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
