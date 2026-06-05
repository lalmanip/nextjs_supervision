import { NextResponse } from "next/server";
import axios from "axios";
import {
  requireSupervisionSession,
  vivapiUserHeaders,
} from "@/lib/supervision-vivapi-proxy";
import type { AgentRegistrationDetail } from "@/types/agent-registration-detail";

type RouteContext = { params: Promise<{ userOid: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const session = await requireSupervisionSession();
  if (!session.ok) return session.response;

  const { userOid } = await context.params;
  if (!userOid || !/^\d+$/.test(userOid)) {
    return NextResponse.json({ message: "Invalid user id" }, { status: 400 });
  }

  try {
    const { base, headers } = await vivapiUserHeaders();
    const upstreamUrl = `${base}/vivapi-user/user/agent/registration/${encodeURIComponent(userOid)}`;
    const res = await axios.get(upstreamUrl, {
      headers,
      timeout: 30_000,
      validateStatus: () => true,
    });

    if (res.status < 200 || res.status >= 300) {
      const msg =
        (res.data as { message?: string })?.message ||
        `Failed to load registration (${res.status})`;
      return NextResponse.json({ message: msg }, { status: res.status >= 400 ? res.status : 502 });
    }

    const raw = res.data as { response?: AgentRegistrationDetail; status?: string };
    const detail = raw?.response;
    if (!detail) {
      return NextResponse.json({ message: "Empty registration detail" }, { status: 502 });
    }

    return NextResponse.json({ status: "success" as const, detail }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load registration";
    return NextResponse.json({ message }, { status: 502 });
  }
}
