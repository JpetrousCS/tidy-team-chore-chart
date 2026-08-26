import { NextResponse } from "next/server";
import { ensureAuthTables, ensureTable } from "../../../lib/db";
import { clearKidSession, createKidSession, getKidSession, hashKidPin, verifyKidPin } from "../../../lib/kid-auth";
import { hasParentSession } from "../../../lib/parent-auth";

export const runtime = "nodejs";
const HOUSEHOLD_ID = "default-household";
const validPin = (value: unknown) => typeof value === "string" && /^\d{4}$/.test(value);

async function householdMembers() {
  const sql = await ensureTable();
  if (!sql) return [];
  const rows = await sql`SELECT data FROM household_state WHERE id = ${HOUSEHOLD_ID}`;
  return (rows[0]?.data?.members ?? []) as Array<{ id: string; name: string; initial: string; color: string; celebrationEmoji: string }>;
}

export async function GET() {
  const sql = await ensureAuthTables();
  if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const memberId = await getKidSession();
  const members = await householdMembers();
  const configuredRows = await sql`SELECT member_id FROM kid_accounts`;
  return NextResponse.json({ memberId, members, configuredMemberIds: configuredRows.map((row) => row.member_id) });
}

export async function POST(request: Request) {
  const { memberId, pin } = await request.json();
  if (!validPin(pin) || typeof memberId !== "string") return NextResponse.json({ error: "Enter a four-digit PIN" }, { status: 400 });
  const members = await householdMembers();
  if (!members.some((member) => member.id === memberId)) return NextResponse.json({ error: "Child profile not found" }, { status: 404 });
  const sql = await ensureAuthTables();
  if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const rows = await sql`SELECT pin_hash FROM kid_accounts WHERE member_id = ${memberId}`;
  if (!rows[0]?.pin_hash || !verifyKidPin(pin, rows[0].pin_hash as string)) return NextResponse.json({ error: rows[0] ? "That PIN did not match" : "A parent needs to create this login first" }, { status: 401 });
  await createKidSession(memberId);
  return NextResponse.json({ ok: true, memberId });
}

export async function PUT(request: Request) {
  if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 403 });
  const { memberId, pin } = await request.json();
  if (!validPin(pin) || typeof memberId !== "string") return NextResponse.json({ error: "Use exactly four numbers" }, { status: 400 });
  const members = await householdMembers();
  if (!members.some((member) => member.id === memberId)) return NextResponse.json({ error: "Child profile not found" }, { status: 404 });
  const sql = await ensureAuthTables();
  if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  await sql`INSERT INTO kid_accounts (member_id, pin_hash, updated_at) VALUES (${memberId}, ${hashKidPin(pin)}, NOW()) ON CONFLICT (member_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = NOW()`;
  await sql`DELETE FROM kid_sessions WHERE member_id = ${memberId}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearKidSession();
  return NextResponse.json({ ok: true });
}
