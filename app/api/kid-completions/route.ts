import { NextResponse } from "next/server";
import { ensureTable } from "../../../lib/db";
import { getKidSession } from "../../../lib/kid-auth";

export const runtime = "nodejs";
const HOUSEHOLD_ID = "default-household";
type Completion = { id?: string; choreId: string; date: string; status?: "pending" | "approved"; participantIds?: string[]; stepIds?: string[] };

function rotationMember(chore: Record<string, unknown>, members: Array<{ id: string }>, date: string) {
  if (!chore.rotate) return chore.memberId;
  const when = new Date(`${date}T12:00:00`);
  const week = Math.floor(Date.UTC(when.getFullYear(), when.getMonth(), when.getDate()) / 604800000);
  return members[(week + Number(chore.rotationOffset ?? 0)) % members.length]?.id ?? chore.memberId;
}

export async function POST(request: Request) {
  const memberId = await getKidSession();
  if (!memberId) return NextResponse.json({ error: "Child sign-in required" }, { status: 401 });
  const { completion, removeId } = await request.json() as { completion?: Completion; removeId?: string };
  const sql = await ensureTable();
  if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const rows = await sql`SELECT data FROM household_state WHERE id = ${HOUSEHOLD_ID}`;
  const state = rows[0]?.data;
  if (!state) return NextResponse.json({ error: "Family account not found" }, { status: 404 });
  const current = (state.completions ?? []) as Completion[];
  let target = completion;
  if (removeId) target = current.find((item) => item.id === removeId);
  if (!target || !target.id || !target.choreId || !/^\d{4}-\d{2}-\d{2}$/.test(target.date)) return NextResponse.json({ error: "Invalid completion" }, { status: 400 });
  const chore = (state.chores as Array<Record<string, unknown>>).find((item) => item.id === target!.choreId);
  const assigned = chore && ((chore.memberIds as string[] | undefined)?.includes(memberId) || rotationMember(chore, state.members, target.date) === memberId);
  if (!assigned) return NextResponse.json({ error: "This chore is not assigned to this child" }, { status: 403 });

  let completions: Completion[];
  if (removeId) {
    const existing = current.find((item) => item.id === removeId);
    if (!existing) return NextResponse.json({ error: "Completion not found" }, { status: 404 });
    if ((chore?.memberIds as string[] | undefined)?.length && existing.participantIds?.some((id) => id !== memberId)) {
      completions = current.map((item): Completion => item.id === removeId ? { ...item, participantIds: item.participantIds?.filter((id) => id !== memberId), status: "pending" } : item).filter((item) => item.participantIds?.length !== 0);
    } else completions = current.filter((item) => item.id !== removeId);
  } else {
    const existing = current.find((item) => item.id === target!.id);
    const participants = target.participantIds ?? [];
    if ((chore?.memberIds as string[] | undefined)?.length) {
      const previous = existing?.participantIds ?? [];
      if (participants.some((id) => id !== memberId && !previous.includes(id)) || previous.some((id) => id !== memberId && !participants.includes(id))) return NextResponse.json({ error: "A child can confirm only their own part" }, { status: 403 });
    }
    const safe: Completion = { id: target.id, choreId: target.choreId, date: target.date, stepIds: target.stepIds?.map(String), participantIds: participants, status: chore.verification && chore.verification !== "none" ? "pending" : target.status === "approved" ? "approved" : "pending" };
    completions = existing ? current.map((item) => item.id === safe.id ? safe : item) : [...current, safe];
  }
  const next = { ...state, completions };
  await sql`UPDATE household_state SET data = ${sql.json(next)}, updated_at = NOW() WHERE id = ${HOUSEHOLD_ID}`;
  return NextResponse.json(next);
}
