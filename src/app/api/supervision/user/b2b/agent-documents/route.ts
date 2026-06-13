import { NextResponse } from "next/server";
import axios from "axios";
import {
  requireSupervisionSession,
  vivapiUserHeaders,
} from "@/lib/supervision-vivapi-proxy";

export async function GET(req: Request) {
  const session = await requireSupervisionSession();
  if (!session.ok) return session.response;

  const storedPath = new URL(req.url).searchParams.get("storedPath")?.trim();
  if (!storedPath || storedPath.includes("..") || !storedPath.startsWith("agent/")) {
    return NextResponse.json({ message: "Invalid storedPath" }, { status: 400 });
  }

  try {
    const { base, headers } = await vivapiUserHeaders();
    const upstreamUrl = `${base}/vivapi-user/user/agent/documents/file?storedPath=${encodeURIComponent(storedPath)}`;
    const { "Content-Type": _omit, ...downloadHeaders } = headers;
    const res = await axios.get(upstreamUrl, {
      headers: downloadHeaders,
      responseType: "arraybuffer",
      timeout: 60_000,
      validateStatus: () => true,
    });

    if (res.status < 200 || res.status >= 300) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: res.status === 404 ? 404 : 502 },
      );
    }

    const contentType =
      (typeof res.headers["content-type"] === "string" && res.headers["content-type"]) ||
      "application/octet-stream";

    return new NextResponse(res.data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load document";
    return NextResponse.json({ message }, { status: 502 });
  }
}
