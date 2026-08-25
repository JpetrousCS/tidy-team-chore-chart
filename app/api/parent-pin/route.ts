import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { pin } = (await request.json()) as { pin?: string };
  const expected = process.env.PARENT_PIN;
  if (!expected || typeof pin !== "string") return NextResponse.json({ ok: false }, { status: 401 });
  const providedBuffer = Buffer.from(pin);
  const expectedBuffer = Buffer.from(expected);
  const matches = providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
  return matches ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 401 });
}
