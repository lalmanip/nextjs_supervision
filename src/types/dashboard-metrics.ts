/** Upstream GET vivapi-user/dashboard/metrics → {@code response}. */
export type DashboardDailyTrend = {
  date: string;
  bookings: number;
  revenue: number;
};

export type DashboardMetrics = {
  totalBookingsMtd: number;
  revenueMtd: number;
  currency: string;
  failedTransactions24h: number;
  activeAgencies: number;
  dailyTrends: DashboardDailyTrend[];
};

export type DashboardMetricsApiOk = {
  status: "success";
  metrics: DashboardMetrics;
};
