import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ensureAuthTables } from "./db";

const COOKIE_NAME = "tidy-team-kid";
const SESSION_DAYS = 90;

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export function hashKidPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyKidPin(pin: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(pin, salt, 32);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createKidSession(memberId: string) {
  const sql = await ensureAuthTables();
  if (!sql) return false;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await sql`DELETE FROM kid_sessions WHERE expires_at < NOW()`;
  await sql`INSERT INTO kid_sessions (token_hash, member_id, expires_at) VALUES (${tokenHash(token)}, ${memberId}, ${expiresAt})`;
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", path: "/", maxAge: SESSION_DAYS * 86400 });
  return true;
}

export async function getKidSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sql = await ensureAuthTables();
  if (!sql) return null;
  const rows = await sql`SELECT member_id FROM kid_sessions WHERE token_hash = ${tokenHash(token)} AND expires_at > NOW()`;
  return rows[0]?.member_id as string | undefined ?? null;
}

export async function clearKidSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const sql = await ensureAuthTables();
  if (token && sql) await sql`DELETE FROM kid_sessions WHERE token_hash = ${tokenHash(token)}`;
  jar.delete(COOKIE_NAME);
}
