import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "tidy-team-parent";
const FAMILY_COOKIE_NAME = "tidy-team-family";

function signature(value: string) {
  const secret = process.env.SESSION_SECRET || process.env.PARENT_PIN || "";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export async function hasParentSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || Number(expires) < Date.now()) return false;
  const expected = signature(expires);
  return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function hasFamilySession() {
  const token = (await cookies()).get(FAMILY_COOKIE_NAME)?.value;
  if (!token) return false;
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || Number(expires) < Date.now()) return false;
  const expected = signature(`family-${expires}`);
  return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function createParentSession() {
  const expires = String(Date.now() + 12 * 60 * 60 * 1000);
  (await cookies()).set(COOKIE_NAME, `${expires}.${signature(expires)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", path: "/", maxAge: 12 * 60 * 60 });
  const familyExpires = String(Date.now() + 90 * 24 * 60 * 60 * 1000);
  (await cookies()).set(FAMILY_COOKIE_NAME, `${familyExpires}.${signature(`family-${familyExpires}`)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", path: "/", maxAge: 90 * 24 * 60 * 60 });
}

export async function clearParentSession() {
  (await cookies()).delete(COOKIE_NAME);
}
