import { NextResponse } from "next/server";
import { ensureTable } from "../../../lib/db";
import { hasParentSession } from "../../../lib/parent-auth";

export const runtime = "nodejs";
const HOUSEHOLD_ID = "default-household";

export async function GET() {
  const sql = await ensureTable();
  if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const rows = await sql`SELECT data FROM household_state WHERE id = ${HOUSEHOLD_ID}`;
  return NextResponse.json(rows[0]?.data ?? null);
}

export async function PUT(request: Request) {
  const sql = await ensureTable();
  if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const data = await request.json();
  if (!(await hasParentSession())) {
    const rows = await sql`SELECT data FROM household_state WHERE id = ${HOUSEHOLD_ID}`;
    const current = rows[0]?.data;
    if (current) {
      const protectedKeys = ["household", "chores", "rewards", "adjustments", "removedDefaultChoreIds", "pointPolicy", "notificationSettings", "accessibilitySettings"];
      const changedProtectedKey = protectedKeys.some((key) => JSON.stringify(current[key] ?? null) !== JSON.stringify(data[key] ?? null));
      const safeMembers = (members: Array<Record<string, unknown>> = []) => members.map((member) => { const copy = { ...member }; delete copy.rewardGoalId; return copy; });
      const changedMembers = JSON.stringify(safeMembers(current.members)) !== JSON.stringify(safeMembers(data.members));
      const changed = changedProtectedKey || changedMembers;
      if (changed) return NextResponse.json({ error: "Parent authorization required" }, { status: 403 });
    }
  }
  await sql`INSERT INTO household_state (id, data, updated_at)
    VALUES (${HOUSEHOLD_ID}, ${sql.json(data)}, NOW())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
  return NextResponse.json({ ok: true });
}
