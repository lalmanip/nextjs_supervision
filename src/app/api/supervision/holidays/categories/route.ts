import { NextResponse } from "next/server";
import { extractRecordArray } from "@/lib/api-response-array";
import {
  proxyHolidaysRequest,
  requireSupervisionAuth,
} from "@/lib/holidays-bff-proxy";

export async function GET() {
  const auth = await requireSupervisionAuth();
  if (auth) return auth;

  const res = await proxyHolidaysRequest({
    method: "GET",
    upstreamPath: "/api/v1/holidays/categories",
    logLabel: "GET holidays categories",
  });

  if (res.status !== 200) return res;

  const json = (await res.json()) as { status: string; data: unknown };
  const categories = extractRecordArray(json.data);
  return NextResponse.json({
    status: "success" as const,
    categories,
    raw: json.data,
  });
}
