import { NextResponse } from "next/server";
import {
  proxyHolidaysRequest,
  requireSupervisionAuth,
} from "@/lib/holidays-bff-proxy";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireSupervisionAuth();
  if (auth) return auth;

  const { slug } = await ctx.params;

  const res = await proxyHolidaysRequest({
    method: "GET",
    upstreamPath: `/api/v1/holidays/admin/destinations/${encodeURIComponent(slug)}`,
    logLabel: "GET holidays destination detail",
  });

  if (res.status !== 200) return res;

  const json = (await res.json()) as { status: string; data: unknown };
  const raw = json.data;
  const destination =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return NextResponse.json({
    status: "success" as const,
    destination,
    raw,
  });
}
