import { NextResponse } from "next/server";
import { requireSupervisionAuth } from "@/lib/holidays-bff-proxy";
import { proxyHolidaysMediaUpload } from "@/lib/holidays-media-proxy";

const ALLOWED_KINDS = new Set(["destination-hero", "package"]);

export async function POST(req: Request) {
  const auth = await requireSupervisionAuth();
  if (auth) return auth;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: "Invalid multipart body" }, { status: 400 });
  }

  const kind = String(form.get("kind") ?? "").trim();
  const file = form.get("file");

  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json(
      { message: "kind must be destination-hero or package" },
      { status: 400 }
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "file is required" }, { status: 400 });
  }

  return proxyHolidaysMediaUpload(kind, file);
}
