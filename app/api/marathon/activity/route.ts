import { authenticatedUser, communityDb } from "@/lib/community-server";
import { ensureAdminSchema, ensureUserAccess, safeSessionId } from "@/lib/admin-server";

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти" }, { status: 401 });
  const body = await request.json().catch(() => null) as null | { sessionId?: unknown; active?: unknown; activeSeconds?: unknown };
  const sessionId = safeSessionId(body?.sessionId);
  if (!sessionId || typeof body?.active !== "boolean" || typeof body?.activeSeconds !== "number" || !Number.isFinite(body.activeSeconds)) {
    return Response.json({ error: "Некорректная активность" }, { status: 400 });
  }
  await ensureAdminSchema();
  await ensureUserAccess(user);
  const db = communityDb();
  const now = Math.floor(Date.now() / 1000);
  const previous = await db.prepare("SELECT user_id, last_seen_at FROM marathon_sessions WHERE session_id = ?")
    .bind(sessionId).first<{ user_id: string; last_seen_at: number }>();
  if (previous && previous.user_id !== user.id) return Response.json({ error: "Нет доступа" }, { status: 403 });
  const seconds = previous ? Math.max(0, Math.min(30, body.activeSeconds, now - previous.last_seen_at)) : 0;
  await db.prepare(`INSERT INTO marathon_sessions
    (session_id, user_id, started_at, last_seen_at, active_seconds, is_active) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET last_seen_at = excluded.last_seen_at,
      active_seconds = marathon_sessions.active_seconds + excluded.active_seconds, is_active = excluded.is_active`)
    .bind(sessionId, user.id, now, now, seconds, body.active ? 1 : 0).run();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
