import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { hasParentSession } from "../../../lib/parent-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Private photo storage is not connected" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 8_000_000) return NextResponse.json({ error: "Choose an image under 8 MB" }, { status: 400 });
  const safeType = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const blob = await put(`proof/${crypto.randomUUID()}.${safeType}`, file, { access: "private", addRandomSuffix: true, cacheControlMaxAge: 60 });
  return NextResponse.json({ pathname: blob.pathname });
}
