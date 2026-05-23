import { NextResponse } from "next/server";
import { extractRecordArray } from "@/lib/api-response-array";
import {
  proxyHolidaysRequest,
  requireSupervisionAuth,
} from "@/lib/holidays-bff-proxy";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const auth = await requireSupervisionAuth();
  if (auth) return auth;

  const { slug } = await ctx.params;
  const categoryCode = new URL(req.url).searchParams.get("categoryCode")?.trim();
  if (!categoryCode) {
    return NextResponse.json(
      { message: 'Query "categoryCode" is required' },
      { status: 400 }
    );
  }

  const res = await proxyHolidaysRequest({
    method: "GET",
    upstreamPath: `/api/v1/holidays/destinations/${encodeURIComponent(slug)}/packages`,
    query: { categoryCode },
    logLabel: "GET holidays destination packages",
  });

  if (res.status !== 200) return res;

  const json = (await res.json()) as { status: string; data: unknown };
  const packages = extractRecordArray(json.data);
  return NextResponse.json({
    status: "success" as const,
    packages,
    raw: json.data,
  });
}
