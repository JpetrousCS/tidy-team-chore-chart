import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  client ??= postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  return client;
}

export async function ensureTable() {
  const sql = getDb();
  if (!sql) return null;
  await sql`CREATE TABLE IF NOT EXISTS household_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  return sql;
}

export async function ensureAuthTables() {
  const sql = getDb();
  if (!sql) return null;
  await sql`CREATE TABLE IF NOT EXISTS parent_passkeys (
    id TEXT PRIMARY KEY,
    public_key BYTEA NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS auth_challenges (
    kind TEXT PRIMARY KEY,
    challenge TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  return sql;
}

export async function ensureCalendarTable() {
  const sql = getDb();
  if (!sql) return null;
  await sql`CREATE TABLE IF NOT EXISTS calendar_feeds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'family',
    color TEXT NOT NULL DEFAULT '#e76f35',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE calendar_feeds ADD COLUMN IF NOT EXISTS emoji TEXT NOT NULL DEFAULT '🗓️'`;
  await sql`ALTER TABLE calendar_feeds ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE`;
  await sql`CREATE TABLE IF NOT EXISTS family_calendar_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    location TEXT NOT NULL DEFAULT '',
    calendar TEXT NOT NULL DEFAULT 'Petrous Family',
    color TEXT NOT NULL DEFAULT '#6957d5',
    emoji TEXT NOT NULL DEFAULT '📌',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  return sql;
}
