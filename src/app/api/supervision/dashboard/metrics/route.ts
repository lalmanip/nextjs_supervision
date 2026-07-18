import { NextResponse } from "next/server";
import axios from "axios";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";
import {
  requireSupervisionSession,
  vivapiUserHeaders,
} from "@/lib/supervision-vivapi-proxy";
import type { DashboardMetrics } from "@/types/dashboard-metrics";

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
}

function normalizeMetrics(raw: unknown): DashboardMetrics | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const trendsRaw = Array.isArray(r.dailyTrends) ? r.dailyTrends : [];
  const dailyTrends = trendsRaw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t) => ({
      date: typeof t.date === "string" ? t.date : String(t.date ?? ""),
      bookings: asNumber(t.bookings),
      revenue: asNumber(t.revenue),
    }));

  return {
    totalBookingsMtd: asNumber(r.totalBookingsMtd),
    revenueMtd: asNumber(r.revenueMtd),
    currency: typeof r.currency === "string" && r.currency.trim() ? r.currency : "INR",
    failedTransactions24h: asNumber(r.failedTransactions24h),
    activeAgencies: asNumber(r.activeAgencies),
    dailyTrends,
  };
}

export async function GET() {
  const session = await requireSupervisionSession();
  if (!session.ok) return session.response;

  let upstream: Awaited<ReturnType<typeof vivapiUserHeaders>>;
  try {
    upstream = await vivapiUserHeaders();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to authorize upstream";
    return NextResponse.json({ message }, { status: 502 });
  }

  const upstreamUrl = `${upstream.base}/vivapi-user/dashboard/metrics`;

  try {
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:GET dashboard metrics (upstream)", {
        endpoint: upstreamUrl,
        method: "GET",
        requestHeaders: sanitizeHeaders(upstream.headers),
      });
    }

    const res = await axios.get(upstreamUrl, {
      headers: upstream.headers,
      timeout: 30_000,
      validateStatus: () => true,
    });

    if (isServerApiDebugEnabled()) {
      logApiDebug("route:GET dashboard metrics (upstream response)", {
        endpoint: upstreamUrl,
        status: res.status,
        statusText: res.statusText,
        responseData: sanitizeForLog(res.data),
      });
    }

    if (res.status < 200 || res.status >= 300) {
      const data = res.data as { message?: string; error?: string };
      const msg =
        data?.message || data?.error || `Dashboard metrics failed (${res.status})`;
      return NextResponse.json(
        { message: msg, status: res.status },
        { status: res.status >= 400 ? res.status : 502 }
      );
    }

    const envelope = res.data as { response?: unknown; status?: string; message?: string };
    if (envelope.status === "failed") {
      return NextResponse.json(
        { message: envelope.message || "Dashboard metrics failed" },
        { status: 502 }
      );
    }

    const metrics = normalizeMetrics(envelope.response);
    if (!metrics) {
      return NextResponse.json(
        { message: "Dashboard metrics were missing in the upstream response" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { status: "success" as const, metrics },
      { status: 200 }
    );
  } catch (err: unknown) {
    const ax = err as { message?: string; response?: { data?: unknown } };
    if (isServerApiDebugEnabled()) {
      logApiDebug("route:GET dashboard metrics (error)", {
        endpoint: upstreamUrl,
        errorMessage: ax?.message,
        responseData: sanitizeForLog(ax?.response?.data),
      });
    }
    return NextResponse.json(
      { message: ax?.message || "Failed to load dashboard metrics" },
      { status: 502 }
    );
  }
}
