import { NextResponse } from "next/server";
import { ensureTable } from "../../../lib/db";
import { getKidSession } from "../../../lib/kid-auth";

export const runtime = "nodejs";
const HOUSEHOLD_ID = "default-household";
const iso = (date: Date) => date.toISOString().slice(0, 10);
const startOfWeek = (date: Date) => { const next = new Date(date); next.setDate(next.getDate() - next.getDay()); return next; };
type Member = { id: string };
type Chore = { id: string; memberId: string; memberIds?: string[]; points: number; teamBonus?: number; rotate?: boolean; rotationOffset?: number };
type Completion = { choreId: string; date: string; status?: string };
type Adjustment = { memberId: string; createdAt: string; amount: number };
type Redemption = { rewardId: string; memberId: string; cost: number; quantity?: number; contributions?: Record<string, number>; redeemedAt: string; status?: string };
type Reward = { id: string; title: string; cost: number; scope?: "individual" | "family"; memberIds?: string[]; limit?: "unlimited" | "daily" | "weekly" | "monthly"; limitQuantity?: number };
type HouseholdState = { members: Member[]; chores: Chore[]; completions: Completion[]; adjustments: Adjustment[]; redemptions: Redemption[]; rewards: Reward[]; pointPolicy?: { reset?: "never" | "weekly" | "monthly"; dailyEarnLimit?: number; maxBalance?: number }; [key: string]: unknown };

function balances(state: HouseholdState) {
  const reset = state.pointPolicy?.reset ?? "never"; const now = new Date();
  const dailyEarnLimit = state.pointPolicy?.dailyEarnLimit ?? 0; const maxBalance = state.pointPolicy?.maxBalance ?? 0;
  const periodStart = reset === "weekly" ? iso(startOfWeek(now)) : reset === "monthly" ? iso(new Date(now.getFullYear(), now.getMonth(), 1)) : "0000-00-00";
  return Object.fromEntries(state.members.map((member: { id: string }) => {
    const earnedByDay = new Map<string, number>();
    state.completions.filter((item) => item.date >= periodStart && item.status !== "pending").forEach((item) => {
      const chore = state.chores.find((entry) => { if (entry.id !== item.choreId) return false; if (entry.memberIds?.includes(member.id)) return true; if (!entry.rotate) return entry.memberId === member.id; const when = new Date(`${item.date}T12:00:00`); const week = Math.floor(Date.UTC(when.getFullYear(), when.getMonth(), when.getDate()) / 604800000); return state.members[(week + (entry.rotationOffset ?? 0)) % state.members.length]?.id === member.id; });
      if (chore) earnedByDay.set(item.date, (earnedByDay.get(item.date) ?? 0) + chore.points + (chore.memberIds?.length ? chore.teamBonus ?? 5 : 0));
    });
    const earned = Array.from(earnedByDay.values()).reduce((sum: number, amount: number) => sum + (dailyEarnLimit > 0 ? Math.min(amount, dailyEarnLimit) : amount), 0);
    const adjusted = state.adjustments.filter((item) => item.memberId === member.id && item.createdAt.slice(0, 10) >= periodStart).reduce((sum, item) => sum + item.amount, 0);
    const spent = state.redemptions.filter((item) => item.status === "approved" && item.redeemedAt.slice(0, 10) >= periodStart && (item.memberId === member.id || item.contributions?.[member.id])).reduce((sum, item) => sum + (item.contributions?.[member.id] ?? item.cost), 0);
    const available = Math.max(0, earned + adjusted - spent); const capped = maxBalance > 0 ? Math.min(available, maxBalance) : available;
    return [member.id, capped];
  }));
}

export async function POST(request: Request) {
  const memberId = await getKidSession();
  if (!memberId) return NextResponse.json({ error: "Child sign-in required" }, { status: 401 });
  const { rewardId, quantity: rawQuantity } = await request.json(); const quantity = Math.max(1, Math.min(10, Number(rawQuantity) || 1));
  const sql = await ensureTable(); if (!sql) return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  const rows = await sql`SELECT data FROM household_state WHERE id = ${HOUSEHOLD_ID}`; const state = rows[0]?.data as HouseholdState | undefined;
  if (!state) return NextResponse.json({ error: "Family account not found" }, { status: 404 });
  const reward = state.rewards.find((item) => item.id === rewardId); if (!reward) return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  if (reward.scope !== "family" && reward.memberIds?.length && !reward.memberIds.includes(memberId)) return NextResponse.json({ error: "This reward is not available for this child" }, { status: 403 });
  const totalCost = reward.cost * quantity; const points = balances(state);
  const contributions = reward.scope === "family" ? Object.fromEntries(state.members.map((member, index) => [member.id, Math.floor(totalCost / state.members.length) + (index < totalCost % state.members.length ? 1 : 0)])) : undefined;
  const affordable = contributions ? state.members.every((member) => points[member.id] >= contributions[member.id]) : points[memberId] >= totalCost;
  if (!affordable) return NextResponse.json({ error: "There are not enough stars for this reward" }, { status: 400 });
  if (reward.limit && reward.limit !== "unlimited") {
    const start = reward.limit === "daily" ? iso(new Date()) : reward.limit === "weekly" ? iso(startOfWeek(new Date())) : iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const owner = reward.scope === "family" ? "family" : memberId;
    const used = state.redemptions.filter((item) => item.rewardId === reward.id && item.memberId === owner && item.redeemedAt.slice(0, 10) >= start).reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    if (used + quantity > (reward.limitQuantity ?? 1)) return NextResponse.json({ error: "This reward’s redemption limit has been reached" }, { status: 400 });
  }
  const redemption = { id: `${Date.now()}`, rewardId: reward.id, rewardTitle: reward.title, memberId: reward.scope === "family" ? "family" : memberId, cost: totalCost, quantity, contributions, redeemedAt: new Date().toISOString(), status: "pending" };
  const next = { ...state, redemptions: [...state.redemptions, redemption] };
  await sql`UPDATE household_state SET data = ${sql.json(next)}, updated_at = NOW() WHERE id = ${HOUSEHOLD_ID}`;
  return NextResponse.json(next);
}
