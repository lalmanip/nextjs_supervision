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
  filterEnquiriesBySegment,
  type B2cEnquiryRow,
  type EnquiryListSegment,
} from "@/types/b2c-enquiry";

type ApiOk = {
  status: "success";
  enquiries: B2cEnquiryRow[];
  raw?: unknown;
};

const SEGMENT_COPY: Record<
  EnquiryListSegment,
  {
    title: string;
    description: string;
    cardTitle: string;
    emptyMessage: string;
    searchPlaceholder: string;
  }
> = {
  b2c: {
    title: "B2C Enquiry",
    description:
      "Customer enquiries from vivapi-user (all purposes except holidays packages).",
    cardTitle: "B2C enquiries",
    emptyMessage: "No B2C enquiries in this segment.",
    searchPlaceholder: "Search B2C enquiries...",
  },
  holidays: {
    title: "Holidays Enquiry",
    description: 'Enquiries with purpose "holidays packages" only.',
    cardTitle: "Holidays package enquiries",
    emptyMessage: "No holidays package enquiries.",
    searchPlaceholder: "Search holidays enquiries...",
  },
};

function formatHeader(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function isMessageFieldKey(key: string): boolean {
  return key.toLowerCase() === "message";
}

function formatCell(key: string, v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function EnquiryMessageCell({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-zinc-400">—</span>;
  }
  const text = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  if (!text.trim()) {
    return <span className="text-zinc-400">—</span>;
  }
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
      {text}
    </div>
  );
}

function renderCell(key: string, value: unknown) {
  if (isMessageFieldKey(key)) {
    return <EnquiryMessageCell value={value} />;
  }
  return formatCell(key, value);
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
    const isMessage = label === "Message" || isMessageFieldKey(found);
    cols.push({
      id: found,
      accessorKey: found as keyof B2cEnquiryRow & string,
      header: label,
      ...(isEnqDate ? { sortingFn: dateSort } : {}),
      ...(isMessage
        ? {
            meta: {
              thClassName: "min-w-[14rem] max-w-[32rem]",
              tdClassName: "min-w-[14rem] max-w-[32rem]",
            },
          }
        : {}),
      cell: ({ row }) =>
        renderCell(found, (row.original as Record<string, unknown>)[found]),
    });
    present.delete(found);
  }

  for (const key of [...present].sort()) {
    const isMessage = isMessageFieldKey(key);
    cols.push({
      accessorKey: key as keyof B2cEnquiryRow & string,
      header: formatHeader(key),
      ...(isMessage
        ? {
            meta: {
              thClassName: "min-w-[14rem] max-w-[32rem]",
              tdClassName: "min-w-[14rem] max-w-[32rem]",
            },
          }
        : {}),
      cell: ({ row }) =>
        renderCell(key, (row.original as Record<string, unknown>)[key]),
    });
  }

  return cols;
}

export default function EnquiriesListClient({ segment }: { segment: EnquiryListSegment }) {
  const copy = SEGMENT_COPY[segment];
  const [loading, setLoading] = React.useState(true);
  const [allRows, setAllRows] = React.useState<B2cEnquiryRow[]>([]);
  const [rawFallback, setRawFallback] = React.useState<unknown>(null);

  const rows = React.useMemo(
    () => filterEnquiriesBySegment(allRows, segment),
    [allRows, segment]
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<ApiOk>("/api/supervision/b2c-enquiry");
      const list = (data.enquiries ?? []) as B2cEnquiryRow[];
      setAllRows(list);
      setRawFallback(list.length === 0 && data.raw !== undefined ? data.raw : null);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
      setAllRows([]);
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
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{copy.description}</p>
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
          <CardTitle>{copy.cardTitle}</CardTitle>
          {!loading ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {rows.length} record{rows.length === 1 ? "" : "s"}
              {allRows.length !== rows.length
                ? ` (${allRows.length} total from API)`
                : ""}
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
              <p>{copy.emptyMessage}</p>
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
              searchPlaceholder={copy.searchPlaceholder}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
