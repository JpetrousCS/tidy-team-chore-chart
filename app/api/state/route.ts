import { NextResponse } from "next/server";
import { ensureTable } from "../../../lib/db";
import { hasParentSession } from "../../../lib/parent-auth";
import { getKidSession } from "../../../lib/kid-auth";

export const runtime = "nodejs";
const HOUSEHOLD_ID = "default-household";

export async function GET() {
  if (!(await hasParentSession()) && !(await getKidSession())) return NextResponse.json({ error: "Parent or child sign-in required" }, { status: 401 });
  const sql = await ensureTable();
  if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const rows = await sql`SELECT data FROM household_state WHERE id = ${HOUSEHOLD_ID}`;
  return NextResponse.json(rows[0]?.data ?? null);
}

export async function PUT(request: Request) {
  if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 403 });
  const sql = await ensureTable();
  if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const data = await request.json();
  await sql`INSERT INTO household_state (id, data, updated_at)
    VALUES (${HOUSEHOLD_ID}, ${sql.json(data)}, NOW())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
  return NextResponse.json({ ok: true });
}
