type Statement<S> = {
  bind: (...values: unknown[]) => S;
};
type RewardDatabase<S extends Statement<S>> = {
  prepare: (sql: string) => S;
  batch: (statements: S[]) => Promise<Array<{ meta: { changes: number } }>>;
};

export async function awardMarathonAnswer<S extends Statement<S>>(
  db: RewardDatabase<S>, userId: string, eventId: string, correct: boolean, dateKey: string, now: number,
) {
  if (!correct) return { status: "wrong", awarded: 0 };
  const results = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO score_events
      (user_id, task_id, xp_awarded, reason, date_key, created_at)
      VALUES (?, ?, 1, 'accepted', ?, ?)`)
      .bind(userId, `marathon:${eventId}`, dateKey, now),
    db.prepare(`UPDATE profiles SET xp = xp + 1, correct_count = correct_count + 1, updated_at = ?
      WHERE user_id = ? AND changes() = 1`).bind(now, userId),
  ]);
  const awarded = results[0].meta.changes ? 1 : 0;
  return { status: awarded ? "awarded" : "duplicate", awarded };
}
