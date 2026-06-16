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
  B2B_AGENT_PREFERRED_KEYS,
  formatB2bAgentStatus,
  isB2bAgentHiddenColumn,
  type B2bAgentRow,
} from "@/types/b2b-agent";

type ApiOk = {
  status: "success";
  agents: B2bAgentRow[];
  raw?: unknown;
};

function formatHeader(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function isStatusColumn(key: string): boolean {
  return key.toLowerCase() === "status";
}

function formatCell(key: string, v: unknown): string {
  if (isStatusColumn(key)) return formatB2bAgentStatus(v);
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function buildColumns(rows: B2bAgentRow[]): ColumnDef<B2bAgentRow>[] {
  if (rows.length === 0) return [];

  const present = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => {
      if (!isB2bAgentHiddenColumn(k)) present.add(k);
    });
  }

  const cols: ColumnDef<B2bAgentRow>[] = [];
  const used = new Set<string>();

  for (const key of B2B_AGENT_PREFERRED_KEYS) {
    const found = [...present].find((k) => k.toLowerCase() === key.toLowerCase());
    if (!found) continue;
    used.add(found);
    cols.push({
      id: found,
      accessorKey: found,
      header: formatHeader(found),
      cell: ({ row }) => formatCell(found, row.original[found]),
    });
  }

  for (const key of [...present].filter((k) => !used.has(k)).sort()) {
    cols.push({
      accessorKey: key,
      header: formatHeader(key),
      cell: ({ row }) => formatCell(key, row.original[key]),
    });
  }

  return cols;
}

export default function RegisteredAgentsClient() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<B2bAgentRow[]>([]);
  const [rawFallback, setRawFallback] = React.useState<unknown>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<ApiOk>("/api/supervision/user/b2b/agents");
      const list = data.agents ?? [];
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

  const columns = React.useMemo(() => buildColumns(rows), [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registered agents</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          All B2B agents from the user service, including pending and active accounts.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">Agents</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No registered agents returned from the API.
              </p>
              {rawFallback ? (
                <pre className="max-h-64 overflow-auto rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
                  {JSON.stringify(rawFallback, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              searchPlaceholder="Search agents..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
