import { authenticatedUser, communityDb } from "@/lib/community-server";
import { ensureAdminSchema, ensureUserAccess, safeSessionId } from "@/lib/admin-server";

const eventTypes = new Set(["page_view", "login", "exam_start", "exam_complete", "heartbeat"]);

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin !== requestUrl.origin) {
    return Response.json({ error: "Запрос отклонён" }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2048) {
    return Response.json({ error: "Слишком большой запрос" }, { status: 413 });
  }
  const body = await request.json().catch(() => null) as null | {
    sessionId?: unknown;
    eventType?: unknown;
    path?: unknown;
    activeSeconds?: unknown;
  };
  const sessionId = safeSessionId(body?.sessionId);
  const eventType = typeof body?.eventType === "string" ? body.eventType : "";
  if (!sessionId || !eventTypes.has(eventType)) {
    return Response.json({ error: "Некорректное событие" }, { status: 400 });
  }

  await ensureAdminSchema();
  const user = await authenticatedUser(request);
  if (user) await ensureUserAccess(user);
  const now = Math.floor(Date.now() / 1000);
  const path = typeof body?.path === "string" ? body.path.slice(0, 80) : "/";
  const activeSeconds = Math.max(0, Math.min(60, Number(body?.activeSeconds) || 0));
  const db = communityDb();
  const previousSession = await db.prepare(
    "SELECT last_seen_at FROM analytics_sessions WHERE session_id = ?",
  ).bind(sessionId).first<{ last_seen_at: number }>();
  if (eventType === "heartbeat" && previousSession && now - previousSession.last_seen_at < 10) {
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
  await db.prepare(`INSERT INTO analytics_sessions
    (session_id, user_id, path, started_at, last_seen_at, active_seconds)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      user_id = COALESCE(excluded.user_id, analytics_sessions.user_id),
      path = excluded.path,
      last_seen_at = excluded.last_seen_at,
      active_seconds = analytics_sessions.active_seconds + excluded.active_seconds`)
    .bind(sessionId, user?.id ?? null, path, now, now, activeSeconds)
    .run();

  if (eventType !== "heartbeat") {
    const duplicate = await db.prepare(`SELECT 1 AS found FROM analytics_events
      WHERE session_id = ? AND event_type = ? AND path = ? AND created_at >= ? LIMIT 1`)
      .bind(sessionId, eventType, path, now - 2)
      .first<{ found: number }>();
    if (!duplicate) {
      await db.prepare(`INSERT INTO analytics_events
        (session_id, user_id, event_type, path, created_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(sessionId, user?.id ?? null, eventType, path, now)
        .run();
    }
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
