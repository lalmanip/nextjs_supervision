import { NextResponse } from "next/server";
import { createHolidayPackageSchema } from "@/types/holiday-package-create";
import {
  proxyHolidaysRequest,
  requireSupervisionAuth,
} from "@/lib/holidays-bff-proxy";

type RouteContext = { params: Promise<{ pkgId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireSupervisionAuth();
  if (auth) return auth;

  const { pkgId } = await ctx.params;
  return proxyHolidaysRequest({
    method: "GET",
    upstreamPath: `/api/v1/holidays/packages/${encodeURIComponent(pkgId)}`,
    logLabel: "GET holidays package detail",
  });
}

export async function PUT(req: Request, ctx: RouteContext) {
  const auth = await requireSupervisionAuth();
  if (auth) return auth;

  const { pkgId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createHolidayPackageSchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid holiday package payload";
    return NextResponse.json(
      { message: msg, issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.tourPackage.pkgId !== pkgId) {
    return NextResponse.json(
      {
        message: `Package ID in body (${parsed.data.tourPackage.pkgId}) must match URL (${pkgId})`,
      },
      { status: 400 }
    );
  }

  return proxyHolidaysRequest({
    method: "PUT",
    upstreamPath: `/api/v1/holidays/admin/packages/${encodeURIComponent(pkgId)}`,
    body: parsed.data,
    logLabel: "PUT holidays admin package",
  });
}
