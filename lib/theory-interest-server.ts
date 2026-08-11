import { communityDb } from "@/lib/community-server";

let schemaReady: Promise<void> | null = null;

export function ensureTheoryInterestSchema() {
  if (schemaReady) return schemaReady;
  const db = communityDb();
  schemaReady = db
    .prepare(`CREATE TABLE IF NOT EXISTS theory_interest (
      user_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )`)
    .run()
    .then(() => undefined)
    .catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

export async function theoryInterestState(userId: string) {
  await ensureTheoryInterestSchema();
  const db = communityDb();
  const [countRow, waitingRow] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM theory_interest").first<{ count: number }>(),
    db
      .prepare("SELECT 1 AS waiting FROM theory_interest WHERE user_id = ?")
      .bind(userId)
      .first<{ waiting: number }>(),
  ]);
  return {
    count: Number(countRow?.count ?? 0),
    waiting: Boolean(waitingRow),
  };
}
