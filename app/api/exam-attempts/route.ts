import { authenticatedUser, communityDb } from "@/lib/community-server";
import { ensureAdminSchema, ensureUserAccess } from "@/lib/admin-server";

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  await ensureUserAccess(user);
  await ensureAdminSchema();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.kim !== "string" || typeof body.completedAt !== "string") {
    return Response.json({ error: "Некорректная попытка" }, { status: 400 });
  }
  const id = `${user.id}:${body.kim}:${body.completedAt}`;
  await communityDb().prepare(`INSERT OR REPLACE INTO exam_attempts
    (id, user_id, kim, title, test_score, correct_count, answered_count,
     duration_seconds, completed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id, user.id, body.kim, String(body.title ?? "Вариант"),
      Math.max(0, Math.min(100, Number(body.testScore) || 0)),
      Math.max(0, Number(body.correctCount) || 0),
      Math.max(0, Number(body.answeredCount) || 0),
      Math.max(0, Number(body.durationSeconds) || 0),
      body.completedAt, Math.floor(Date.now() / 1000),
    ).run();
  return Response.json({ ok: true });
}
