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
