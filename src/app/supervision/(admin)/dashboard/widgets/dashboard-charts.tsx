"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardDailyTrend } from "@/types/dashboard-metrics";

type ChartPoint = {
  name: string;
  bookings: number;
  revenue: number;
};

function toChartData(trends: DashboardDailyTrend[]): ChartPoint[] {
  return trends.map((t) => {
    const d = t.date ? new Date(`${t.date}T00:00:00`) : null;
    const name =
      d && !Number.isNaN(d.getTime())
        ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })
        : t.date || "—";
    return {
      name,
      bookings: t.bookings,
      revenue: t.revenue,
    };
  });
}

export default function DashboardCharts({
  trends,
}: {
  trends: DashboardDailyTrend[];
}) {
  const data = React.useMemo(() => toChartData(trends), [trends]);

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        No booking activity in the last 7 days.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="bookings"
          stroke="#fc6603"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#e55a03"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
