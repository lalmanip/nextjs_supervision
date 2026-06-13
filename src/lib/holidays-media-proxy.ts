import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import {
  buildVivapiAuthorizedHeaders,
  fetchVivapiAppBearer,
} from "@/services/vivapi/app-auth";
import {
  isServerApiDebugEnabled,
  logApiDebug,
  sanitizeForLog,
  sanitizeHeaders,
} from "@/lib/api-debug";
import { holidaysApiBase } from "@/lib/holidays-bff-proxy";

export type HolidayMediaUploadResult = {
  storedPath: string;
  url: string;
};

export async function proxyHolidaysMediaUpload(
  kind: string,
  file: File
): Promise<NextResponse> {
  const debug = isServerApiDebugEnabled();
  const upstreamUrl = `${holidaysApiBase()}/api/v1/holidays/admin/media/upload`;

  try {
    const env = getServerEnv();
    const bearer = await fetchVivapiAppBearer(env);
    const authHeaders = buildVivapiAuthorizedHeaders(env, bearer);

    const body = new FormData();
    body.append("kind", kind);
    const bytes = await file.arrayBuffer();
    body.append(
      "file",
      new Blob([bytes], { type: file.type || "application/octet-stream" }),
      file.name || "upload.jpg"
    );

    // Do not send Content-Type: application/json — fetch must set multipart boundary.
    const upstreamHeaders = new Headers();
    upstreamHeaders.set("X-API-KEY", authHeaders["X-API-KEY"]);
    upstreamHeaders.set("Authorization", authHeaders.Authorization);

    if (debug) {
      logApiDebug("route:POST holidays media upload (upstream request)", {
        endpoint: upstreamUrl,
        method: "POST",
        kind,
        fileName: file.name,
        fileSize: file.size,
        requestHeaders: sanitizeHeaders({
          "X-API-KEY": authHeaders["X-API-KEY"],
          Authorization: "Bearer …",
        }),
      });
    }

    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body,
      signal: AbortSignal.timeout(120_000),
    });

    let responseData: unknown = null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      responseData = await res.json();
    } else {
      const text = await res.text();
      if (text) {
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = { message: text };
        }
      }
    }

    if (debug) {
      logApiDebug("route:POST holidays media upload (upstream response)", {
        endpoint: upstreamUrl,
        status: res.status,
        responseData: sanitizeForLog(responseData),
      });
    }

    if (res.status < 200 || res.status >= 300) {
      const data = responseData as { message?: string; detail?: string };
      const msg =
        data?.message ||
        data?.detail ||
        `Image upload failed (${res.status})`;
      return NextResponse.json({ message: msg }, { status: res.status >= 400 ? res.status : 502 });
    }

    const payload = responseData as HolidayMediaUploadResult;
    return NextResponse.json(
      { status: "success" as const, ...payload },
      { status: 200 }
    );
  } catch (err: unknown) {
    const ax = err as { message?: string };
    if (debug) {
      logApiDebug("route:POST holidays media upload (error)", {
        errorMessage: ax?.message,
      });
    }
    return NextResponse.json(
      { message: ax?.message || "Failed to upload image" },
      { status: 502 }
    );
  }
}
