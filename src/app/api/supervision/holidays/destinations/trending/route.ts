import { NextResponse } from "next/server";
import { extractRecordArray } from "@/lib/api-response-array";
import {
  proxyHolidaysRequest,
  requireSupervisionAuth,
} from "@/lib/holidays-bff-proxy";

const REGIONS = new Set(["international", "india"]);

export async function GET(req: Request) {
  const auth = await requireSupervisionAuth();
  if (auth) return auth;

  const region = new URL(req.url).searchParams.get("region")?.trim().toLowerCase();
  if (!region || !REGIONS.has(region)) {
    return NextResponse.json(
      { message: 'Query "region" must be international or india' },
      { status: 400 }
    );
  }

  const res = await proxyHolidaysRequest({
    method: "GET",
    upstreamPath: "/api/v1/holidays/destinations/trending",
    query: { region },
    logLabel: "GET holidays destinations trending",
  });

  if (res.status !== 200) return res;

  const json = (await res.json()) as { status: string; data: unknown };
  const destinations = extractRecordArray(json.data);
  return NextResponse.json({
    status: "success" as const,
    destinations,
    raw: json.data,
  });
}
