"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DashboardMetrics,
  DashboardMetricsApiOk,
} from "@/types/dashboard-metrics";
import DashboardCharts from "./dashboard-charts";

function formatCount(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: amount >= 1_000_000 ? 1 : 0,
      notation: amount >= 1_000_000 ? "compact" : "standard",
      compactDisplay: "short",
    }).format(amount);
  } catch {
    return `${currency || "INR"} ${formatCount(amount)}`;
  }
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-2 h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardClient() {
  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<DashboardMetricsApiOk>(
        "/api/supervision/dashboard/metrics"
      );
      setMetrics(data.metrics);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const kpis = metrics
    ? [
        {
          label: "Total Bookings (MTD)",
          value: formatCount(metrics.totalBookingsMtd),
          hint: "Flight bookings created this month",
        },
        {
          label: "Revenue (MTD)",
          value: formatMoney(metrics.revenueMtd, metrics.currency),
          hint: "Sum of invoice amounts this month",
        },
        {
          label: "Failed Transactions (24h)",
          value: formatCount(metrics.failedTransactions24h),
          hint: "Failed booking recovery rows (last 24 hours)",
        },
        {
          label: "Active Agencies",
          value: formatCount(metrics.activeAgencies),
          hint: "B2B agents with status active",
        },
      ]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            High-level operational and financial overview.
          </p>
        </div>
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
      </div>

      {loading && !metrics ? (
        <KpiSkeleton />
      ) : kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {k.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">{k.value}</div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {k.hint}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-zinc-600 dark:text-zinc-400">
            Could not load dashboard metrics. Check that vivapi-user exposes{" "}
            <code className="text-xs">GET /dashboard/metrics</code> and try again.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Booking &amp; Revenue Trends (7 days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {loading && !metrics ? (
                <Skeleton className="h-[320px] w-full rounded-lg" />
              ) : (
                <DashboardCharts trends={metrics?.dailyTrends ?? []} />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Failed Transactions (24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">
              {metrics ? formatCount(metrics.failedTransactions24h) : "—"}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Rows added to the failed booking recovery queue in the last 24 hours.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/supervision/failed-transactions">Review failed transactions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/supervision/setup-markup"
                className="rounded-lg border border-zinc-200 p-4 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Setup markup for a supplier
              </Link>
              <Link
                href="/supervision/failed-transactions"
                className="rounded-lg border border-zinc-200 p-4 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Review failed transactions
              </Link>
              <Link
                href="/supervision/setup-promotions"
                className="rounded-lg border border-zinc-200 p-4 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Create a promotion
              </Link>
              <Link
                href="/supervision/agency-balance"
                className="rounded-lg border border-zinc-200 p-4 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Check agency balance
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Agencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold">
              {metrics ? formatCount(metrics.activeAgencies) : "—"}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              B2B agents ({`user_type = 3`}) currently active ({`status = 1`}).
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/supervision/agent/registered-agents">View registered agents</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
