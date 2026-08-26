import { del, get, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { hasFamilySession, hasParentSession } from "../../../lib/parent-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await hasFamilySession())) return NextResponse.json({ error: "Use a trusted family device" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Private media storage is not connected" }, { status: 503 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File) || (!file.type.startsWith("image/") && !file.type.startsWith("audio/")) || file.size > 10_000_000) return NextResponse.json({ error: "Choose a photo or recording under 10 MB" }, { status: 400 });
  const extension = file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "bin";
  const blob = await put(`family-journal/${crypto.randomUUID()}.${extension}`, file, { access: "private", addRandomSuffix: true, cacheControlMaxAge: 60 });
  return NextResponse.json({ pathname: blob.pathname, type: file.type });
}

export async function GET(request: NextRequest) {
  if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const pathname = request.nextUrl.searchParams.get("pathname"); if (!pathname?.startsWith("family-journal/")) return NextResponse.json({ error: "Invalid media" }, { status: 400 });
  const blob = await get(pathname, { access: "private", useCache: false }); if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: "Media not found" }, { status: 404 });
  return new NextResponse(blob.stream, { headers: { "content-type": blob.blob.contentType || "application/octet-stream", "content-disposition": `inline; filename="${pathname.split("/").pop()}"`, "cache-control": "private, no-store" } });
}

export async function DELETE(request: NextRequest) {
  if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const pathname = request.nextUrl.searchParams.get("pathname"); if (!pathname?.startsWith("family-journal/")) return NextResponse.json({ error: "Invalid media" }, { status: 400 });
  await del(pathname); return NextResponse.json({ ok: true });
}
