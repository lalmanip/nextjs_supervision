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

const data = [
  { name: "Mon", bookings: 420, revenue: 1800 },
  { name: "Tue", bookings: 610, revenue: 2500 },
  { name: "Wed", bookings: 540, revenue: 2100 },
  { name: "Thu", bookings: 820, revenue: 3400 },
  { name: "Fri", bookings: 760, revenue: 3200 },
  { name: "Sat", bookings: 680, revenue: 2900 },
  { name: "Sun", bookings: 710, revenue: 3100 },
];

export default function DashboardCharts() {
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

