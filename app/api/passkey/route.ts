import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON, AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";
import { ensureAuthTables } from "../../../lib/db";
import { createParentSession, hasParentSession } from "../../../lib/parent-auth";

export const runtime = "nodejs";

const relyingParty = (request: NextRequest) => ({ rpID: request.nextUrl.hostname, origin: request.nextUrl.origin });

export async function GET(request: NextRequest) {
  const sql = await ensureAuthTables();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const mode = request.nextUrl.searchParams.get("mode");
  const { rpID } = relyingParty(request);
  const rows = await sql`SELECT id, transports FROM parent_passkeys ORDER BY created_at`;
  if (mode === "available") return NextResponse.json({ available: rows.length > 0 });
  if (mode === "register") {
    if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
    const options = await generateRegistrationOptions({ rpName: "Petrous Family Tidy Team", rpID, userName: "parent", userDisplayName: "Petrous Family Parent", attestationType: "none", authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" }, supportedAlgorithmIDs: [-7, -257], excludeCredentials: rows.map((row) => ({ id: row.id, transports: row.transports as AuthenticatorTransportFuture[] })) });
    await sql`INSERT INTO auth_challenges (kind, challenge, updated_at) VALUES ('register', ${options.challenge}, NOW()) ON CONFLICT (kind) DO UPDATE SET challenge = EXCLUDED.challenge, updated_at = NOW()`;
    return NextResponse.json(options);
  }
  if (mode === "authenticate") {
    if (!rows.length) return NextResponse.json({ error: "No passkey is enrolled" }, { status: 404 });
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required", allowCredentials: rows.map((row) => ({ id: row.id, transports: row.transports as AuthenticatorTransportFuture[] })) });
    await sql`INSERT INTO auth_challenges (kind, challenge, updated_at) VALUES ('authenticate', ${options.challenge}, NOW()) ON CONFLICT (kind) DO UPDATE SET challenge = EXCLUDED.challenge, updated_at = NOW()`;
    return NextResponse.json(options);
  }
  return NextResponse.json({ error: "Unknown passkey mode" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const sql = await ensureAuthTables();
  if (!sql) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const mode = request.nextUrl.searchParams.get("mode");
  const { rpID, origin } = relyingParty(request);
  const challengeRows = await sql`SELECT challenge FROM auth_challenges WHERE kind = ${mode === "register" ? "register" : "authenticate"}`;
  const challenge = challengeRows[0]?.challenge;
  if (!challenge) return NextResponse.json({ error: "Passkey request expired" }, { status: 400 });
  if (mode === "register") {
    if (!(await hasParentSession())) return NextResponse.json({ error: "Parent authorization required" }, { status: 401 });
    const response = (await request.json()) as RegistrationResponseJSON;
    const result = await verifyRegistrationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
    if (!result.verified) return NextResponse.json({ verified: false }, { status: 400 });
    const credential = result.registrationInfo.credential;
    await sql`INSERT INTO parent_passkeys (id, public_key, counter, transports) VALUES (${credential.id}, ${Buffer.from(credential.publicKey)}, ${credential.counter}, ${sql.json(response.response.transports ?? [])}) ON CONFLICT (id) DO NOTHING`;
    return NextResponse.json({ verified: true });
  }
  if (mode === "authenticate") {
    const response = (await request.json()) as AuthenticationResponseJSON;
    const rows = await sql`SELECT id, public_key, counter, transports FROM parent_passkeys WHERE id = ${response.id}`;
    const saved = rows[0];
    if (!saved) return NextResponse.json({ verified: false }, { status: 401 });
    const result = await verifyAuthenticationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, credential: { id: saved.id, publicKey: new Uint8Array(saved.public_key), counter: Number(saved.counter), transports: saved.transports as AuthenticatorTransportFuture[] } });
    if (!result.verified) return NextResponse.json({ verified: false }, { status: 401 });
    await sql`UPDATE parent_passkeys SET counter = ${result.authenticationInfo.newCounter} WHERE id = ${saved.id}`;
    await createParentSession();
    return NextResponse.json({ verified: true });
  }
  return NextResponse.json({ error: "Unknown passkey mode" }, { status: 400 });
}
