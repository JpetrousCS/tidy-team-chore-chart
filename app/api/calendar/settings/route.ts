import { NextResponse } from "next/server";
import { ensureCalendarTable } from "../../../../lib/db";
import { hasParentSession } from "../../../../lib/parent-auth";

export const runtime = "nodejs";

async function authorized() { return hasParentSession(); }

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const sql = await ensureCalendarTable();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const feeds = await sql`SELECT id, name, type, color, created_at FROM calendar_feeds ORDER BY created_at`;
  return NextResponse.json({ feeds });
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const sql = await ensureCalendarTable();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const body = await request.json();
  const name = String(body.name || "").trim();
  const rawUrl = String(body.url || "").trim().replace(/^webcal:/, "https:");
  const type = ["kids", "work", "family"].includes(body.type) ? body.type : "family";
  let url: URL;
  try { url = new URL(rawUrl); } catch { return NextResponse.json({ error: "Enter a valid private calendar feed link" }, { status: 400 }); }
  if (url.protocol !== "https:" || !name) return NextResponse.json({ error: "A name and secure HTTPS feed are required" }, { status: 400 });
  const id = crypto.randomUUID();
  const color = type === "kids" ? "#b85dc7" : type === "work" ? "#3186c7" : "#e76f35";
  await sql`INSERT INTO calendar_feeds (id, name, url, type, color) VALUES (${id}, ${name}, ${url.toString()}, ${type}, ${color})`;
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const sql = await ensureCalendarTable();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Feed ID required" }, { status: 400 });
  await sql`DELETE FROM calendar_feeds WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
