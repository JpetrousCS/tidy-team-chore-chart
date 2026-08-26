import { NextResponse } from "next/server";
import { ensureCalendarTable } from "../../../../lib/db";
import { hasParentSession } from "../../../../lib/parent-auth";

export const runtime = "nodejs";

function eventValues(body: Record<string, unknown>) {
  const title = String(body.title || "").trim().slice(0, 100);
  const start = new Date(String(body.start || ""));
  const end = new Date(String(body.end || ""));
  const allDay = Boolean(body.allDay);
  const location = String(body.location || "").trim().slice(0, 120);
  const calendar = String(body.calendar || "Petrous Family").trim().slice(0, 40) || "Petrous Family";
  const color = /^#[0-9a-f]{6}$/i.test(String(body.color)) ? String(body.color) : "#6957d5";
  const emoji = String(body.emoji || "📌").trim().slice(0, 8) || "📌";
  if (!title || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return { title, start, end, allDay, location, calendar, color, emoji };
}

export async function POST(request: Request) {
  if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const sql = await ensureCalendarTable(); if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const values = eventValues(await request.json()); if (!values) return NextResponse.json({ error: "Enter a title and valid start/end time" }, { status: 400 });
  const id = crypto.randomUUID();
  await sql`INSERT INTO family_calendar_events (id, title, starts_at, ends_at, all_day, location, calendar, color, emoji) VALUES (${id}, ${values.title}, ${values.start}, ${values.end}, ${values.allDay}, ${values.location}, ${values.calendar}, ${values.color}, ${values.emoji})`;
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(request: Request) {
  if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const sql = await ensureCalendarTable(); if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const body = await request.json(); const values = eventValues(body); const id = String(body.id || "");
  if (!id || !values) return NextResponse.json({ error: "Enter a title and valid start/end time" }, { status: 400 });
  await sql`UPDATE family_calendar_events SET title=${values.title}, starts_at=${values.start}, ends_at=${values.end}, all_day=${values.allDay}, location=${values.location}, calendar=${values.calendar}, color=${values.color}, emoji=${values.emoji} WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
  const sql = await ensureCalendarTable(); if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "Event ID required" }, { status: 400 });
  await sql`DELETE FROM family_calendar_events WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
