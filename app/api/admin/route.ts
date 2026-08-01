import { authenticatedUser, communityDb } from "@/lib/community-server";
import { ensureAdminSchema, ensureUserAccess, isAdminUser } from "@/lib/admin-server";

async function requireAdmin(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return { error: Response.json({ error: "Нужно войти" }, { status: 401 }) };
  await ensureUserAccess(user);
  if (!(await isAdminUser(user))) {
    return { error: Response.json({ error: "Нет доступа к админ-панели" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  await ensureAdminSchema();
  const db = communityDb();
  const now = Math.floor(Date.now() / 1000);
  const since7 = now - 7 * 86400;
  const since30 = now - 30 * 86400;

  const [online, registered, newUsers, averageTime, users, activity, funnel, content, actions] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS value FROM analytics_sessions WHERE last_seen_at >= ?").bind(now - 120).first<{ value: number }>(),
    db.prepare("SELECT COUNT(*) AS value FROM profiles").first<{ value: number }>(),
    db.prepare("SELECT COUNT(*) AS value FROM profiles WHERE created_at >= ?").bind(since7).first<{ value: number }>(),
    db.prepare("SELECT COALESCE(AVG(active_seconds), 0) AS value FROM analytics_sessions").first<{ value: number }>(),
    db.prepare(`SELECT p.user_id, p.username, p.display_name, p.avatar_emoji, p.created_at,
      COALESCE(a.email, '') AS email, COALESCE(a.premium, 0) AS premium,
      COALESCE(a.last_seen_at, p.updated_at) AS last_seen_at,
      COUNT(e.id) AS variants, COALESCE(ROUND(AVG(e.test_score)), 0) AS average_score
      FROM profiles p
      LEFT JOIN user_access a ON a.user_id = p.user_id
      LEFT JOIN exam_attempts e ON e.user_id = p.user_id
      GROUP BY p.user_id ORDER BY last_seen_at DESC LIMIT 100`).all(),
    db.prepare(`SELECT date(created_at, 'unixepoch') AS day,
      SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS visits,
      SUM(CASE WHEN event_type = 'login' THEN 1 ELSE 0 END) AS registrations
      FROM analytics_events WHERE created_at >= ? GROUP BY day ORDER BY day`).bind(since30).all(),
    db.prepare(`SELECT
      COUNT(DISTINCT session_id) AS opened,
      COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN session_id END) AS logged,
      COUNT(DISTINCT CASE WHEN event_type = 'exam_start' THEN session_id END) AS started,
      COUNT(DISTINCT CASE WHEN event_type = 'exam_complete' THEN session_id END) AS completed
      FROM analytics_events WHERE created_at >= ?`).bind(since30).first(),
    db.prepare(`SELECT CASE
      WHEN path LIKE '/tasks%' THEN 'База заданий'
      WHEN path LIKE '/variants%' THEN 'Варианты'
      WHEN path LIKE '/trainer%' THEN 'Тренажёр'
      ELSE 'Другое' END AS label, COUNT(*) AS value
      FROM analytics_events WHERE event_type = 'page_view' AND created_at >= ?
      GROUP BY label ORDER BY value DESC`).bind(since30).all(),
    db.prepare(`SELECT aa.action, aa.created_at, p.display_name, p.username
      FROM admin_actions aa LEFT JOIN profiles p ON p.user_id = aa.target_user_id
      ORDER BY aa.created_at DESC LIMIT 8`).all(),
  ]);

  return Response.json({
    metrics: {
      online: online?.value ?? 0,
      registered: registered?.value ?? 0,
      newUsers: newUsers?.value ?? 0,
      averageMinutes: Math.round((averageTime?.value ?? 0) / 60),
    },
    users: users.results,
    activity: activity.results,
    funnel: funnel ?? { opened: 0, logged: 0, started: 0, completed: 0 },
    content: content.results,
    actions: actions.results,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null) as null | {
    action?: string;
    userId?: string;
    premium?: boolean;
  };
  if (body?.action !== "set_premium" || !body.userId || typeof body.premium !== "boolean") {
    return Response.json({ error: "Некорректное действие" }, { status: 400 });
  }
  const now = Math.floor(Date.now() / 1000);
  const db = communityDb();
  await ensureAdminSchema();
  await db.prepare(`INSERT INTO user_access
    (user_id, email, premium, first_seen_at, last_seen_at, last_login_at)
    VALUES (?, '', ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET premium = excluded.premium`)
    .bind(body.userId, body.premium ? 1 : 0, now, now, now).run();
  await db.prepare(`INSERT INTO admin_actions
    (admin_user_id, target_user_id, action, created_at) VALUES (?, ?, ?, ?)`)
    .bind(auth.user.id, body.userId, body.premium ? "premium_granted" : "premium_revoked", now)
    .run();
  return Response.json({ ok: true });
}
