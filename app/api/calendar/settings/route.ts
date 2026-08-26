import { NextResponse } from "next/server";
import { ensureCalendarTable } from "../../../../lib/db";
import { hasParentSession } from "../../../../lib/parent-auth";

export const runtime = "nodejs";

async function authorized() { return hasParentSession(); }

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const sql = await ensureCalendarTable();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const feeds = await sql`SELECT id, name, type, color, emoji, visible, created_at FROM calendar_feeds ORDER BY created_at`;
  return NextResponse.json({ feeds });
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const sql = await ensureCalendarTable();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const body = await request.json();
  const name = String(body.name || "").trim();
  const rawUrl = String(body.url || "").trim().replace(/^webcal:/, "https:");
  const type = String(body.type || "Family").trim().slice(0, 30) || "Family";
  const color = /^#[0-9a-f]{6}$/i.test(String(body.color)) ? String(body.color) : "#e76f35";
  const emoji = String(body.emoji || "🗓️").trim().slice(0, 8) || "🗓️";
  let url: URL;
  try { url = new URL(rawUrl); } catch { return NextResponse.json({ error: "Enter a valid private calendar feed link" }, { status: 400 }); }
  if (url.protocol !== "https:" || !name) return NextResponse.json({ error: "A name and secure HTTPS feed are required" }, { status: 400 });
  const id = crypto.randomUUID();
  await sql`INSERT INTO calendar_feeds (id, name, url, type, color, emoji, visible) VALUES (${id}, ${name}, ${url.toString()}, ${type}, ${color}, ${emoji}, TRUE)`;
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const sql = await ensureCalendarTable();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const body = await request.json();
  const id = String(body.id || "");
  const name = String(body.name || "").trim();
  const type = String(body.type || "Family").trim().slice(0, 30) || "Family";
  const color = /^#[0-9a-f]{6}$/i.test(String(body.color)) ? String(body.color) : "#e76f35";
  const emoji = String(body.emoji || "🗓️").trim().slice(0, 8) || "🗓️";
  if (!id || !name) return NextResponse.json({ error: "Calendar and name are required" }, { status: 400 });
  await sql`UPDATE calendar_feeds SET name = ${name}, type = ${type}, color = ${color}, emoji = ${emoji}, visible = ${body.visible !== false} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
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
