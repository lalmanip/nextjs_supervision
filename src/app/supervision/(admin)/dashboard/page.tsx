import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import DashboardCharts from "./widgets/dashboard-charts";

function KpiGrid() {
  const kpis = [
    { label: "Total Bookings (MTD)", value: "12,482" },
    { label: "Revenue (MTD)", value: "PKR 24.1M" },
    { label: "Failed Transactions (24h)", value: "37" },
    { label: "Active Agencies", value: "1,204" },
  ];

  return (
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
              Sample metrics (wire-up APIs later)
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecentActivity() {
  const items = [
    { ts: "2 min ago", text: "Agency A topped up wallet (+PKR 50,000)." },
    { ts: "18 min ago", text: "Promo code SPRING26 created." },
    { ts: "1h ago", text: "Commission rule updated for Corporate." },
    { ts: "3h ago", text: "Failed payment retried successfully (TX-9912)." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((i, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              <div className="min-w-0">
                <div className="text-sm">{i.text}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{i.ts}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          High-level operational and financial overview.
        </p>
      </div>

      <KpiGrid />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Booking & Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <Suspense
                fallback={<Skeleton className="h-[320px] w-full rounded-lg" />}
              >
                <DashboardCharts />
              </Suspense>
            </CardContent>
          </Card>
        </div>
        <RecentActivity />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                Setup markup for a supplier
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                Review failed transactions
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                Create a promotion
              </div>
              <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
                Check agency balance
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failed Transactions (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">37</div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Implement API integration to show error categories and top agencies.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

