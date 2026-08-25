import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { clearParentSession, createParentSession, hasParentSession } from "../../../lib/parent-auth";

export async function GET() {
  return NextResponse.json({ authenticated: await hasParentSession() });
}

export async function POST(request: Request) {
  const { pin } = (await request.json()) as { pin?: string };
  const expected = process.env.PARENT_PIN;
  if (!expected || typeof pin !== "string") return NextResponse.json({ ok: false }, { status: 401 });
  const providedBuffer = Buffer.from(pin);
  const expectedBuffer = Buffer.from(expected);
  const matches = providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
  if (!matches) return NextResponse.json({ ok: false }, { status: 401 });
  await createParentSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearParentSession();
  return NextResponse.json({ ok: true });
}
