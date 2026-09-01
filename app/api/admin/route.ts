import { authenticatedUser, communityDb } from "@/lib/community-server";
import { ensureAdminSchema, ensureUserAccess, isAdminUser } from "@/lib/admin-server";
import { ensureBoardSchema } from "@/lib/boards/server";
import taskIndex from "@/public/data/task-index.json";
import { ensureTeacherSchema, isTeacherTaskId, taskExamNumbers } from "@/lib/teacher-studio-server";

async function variantIsComplete(variantId: number) {
  const db = communityDb();
  const items = await db.prepare("SELECT task_public_id FROM teacher_variant_tasks WHERE variant_id = ? ORDER BY position")
    .bind(variantId).all<{ task_public_id: string }>();
  const authoredIds = [...new Set(items.results.map((item) => item.task_public_id).filter(isTeacherTaskId))];
  const authored = authoredIds.length ? await db.prepare(
    `SELECT public_id, exam_number FROM teacher_tasks WHERE public_id IN (${authoredIds.map(() => "?").join(",")})`,
  ).bind(...authoredIds).all<{ public_id: string; exam_number: number }>() : { results: [] as Array<{ public_id: string; exam_number: number }> };
  const authoredNumbers = new Map(authored.results.map((item) => [item.public_id, taskExamNumbers(item.exam_number)]));
  const numbers = items.results.flatMap((item) => isTeacherTaskId(item.task_public_id)
    ? authoredNumbers.get(item.task_public_id) ?? []
    : [(taskIndex as Record<string, number>)[item.task_public_id] ?? 0]);
  return numbers.length === 27 && numbers.every((number, index) => number === index + 1);
}

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
  await ensureBoardSchema();
  await ensureTeacherSchema();
  const db = communityDb();
  const now = Math.floor(Date.now() / 1000);
  const since7 = now - 7 * 86400;
  const since30 = now - 30 * 86400;

  const [online, registered, newUsers, averageTime, users, activity, funnel, content, actions, teacherTasks, teacherVariants] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS value FROM analytics_sessions WHERE last_seen_at >= ?").bind(now - 120).first<{ value: number }>(),
    db.prepare("SELECT COUNT(*) AS value FROM profiles").first<{ value: number }>(),
    db.prepare("SELECT COUNT(*) AS value FROM profiles WHERE created_at >= ?").bind(since7).first<{ value: number }>(),
    db.prepare("SELECT COALESCE(AVG(active_seconds), 0) AS value FROM analytics_sessions").first<{ value: number }>(),
    db.prepare(`SELECT p.user_id, p.username, p.display_name, p.avatar_emoji, p.created_at,
      COALESCE(a.email, '') AS email, COALESCE(a.board_limit, 3) AS board_limit,
      (SELECT COUNT(*) FROM boards b WHERE b.owner_user_id = p.user_id AND b.deleted_at IS NULL) AS board_count,
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
      WHERE aa.action = 'board_limit_changed' ORDER BY aa.created_at DESC LIMIT 8`).all(),
    db.prepare(`SELECT t.id, t.public_id, t.exam_number, t.note, t.statement_html, t.difficulty,
      t.approved, t.updated_at, COALESCE(p.display_name, 'Автор EGEGE') AS author
      FROM teacher_tasks t LEFT JOIN profiles p ON p.user_id = t.owner_id
      ORDER BY t.approved ASC, t.updated_at DESC LIMIT 200`).all(),
    db.prepare(`SELECT v.id, v.kim, v.title, v.description_html, v.approved, v.updated_at,
      COALESCE(p.display_name, 'Автор EGEGE') AS author, COUNT(vt.position) AS task_count
      FROM teacher_variants v LEFT JOIN profiles p ON p.user_id = v.owner_id
      LEFT JOIN teacher_variant_tasks vt ON vt.variant_id = v.id
      GROUP BY v.id ORDER BY v.approved ASC, v.updated_at DESC LIMIT 200`).all(),
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
    teacherTasks: teacherTasks.results,
    teacherVariants: await Promise.all(teacherVariants.results.map(async (variant) => ({
      ...variant,
      complete: await variantIsComplete(Number((variant as Record<string, unknown>).id)),
    }))),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null) as null | {
    action?: string;
    userId?: string;
    boardLimit?: number;
    id?: number;
    approved?: boolean;
    difficulty?: string;
  };
  const now = Math.floor(Date.now() / 1000);
  const db = communityDb();
  await ensureAdminSchema();
  await ensureTeacherSchema();
  if (body?.action === "moderate_task" && Number.isInteger(body.id) && typeof body.approved === "boolean") {
    const difficulty = ["Базовый", "Средний", "Сложный"].includes(body.difficulty ?? "") ? body.difficulty : "Средний";
    await db.prepare("UPDATE teacher_tasks SET approved = ?, difficulty = ? WHERE id = ?")
      .bind(body.approved ? 1 : 0, difficulty, body.id).run();
    return Response.json({ ok: true });
  }
  if (body?.action === "moderate_variant" && Number.isInteger(body.id) && typeof body.approved === "boolean") {
    if (body.approved && !(await variantIsComplete(body.id!))) {
      return Response.json({ error: "В общий список можно добавить только полный вариант 1–27" }, { status: 400 });
    }
    await db.prepare("UPDATE teacher_variants SET approved = ? WHERE id = ?").bind(body.approved ? 1 : 0, body.id).run();
    return Response.json({ ok: true });
  }
  if (body?.action !== "set_board_limit" || !body.userId || !Number.isInteger(body.boardLimit) || body.boardLimit! < 0 || body.boardLimit! > 100) {
    return Response.json({ error: "Некорректное действие" }, { status: 400 });
  }
  await db.prepare(`INSERT INTO user_access
    (user_id, email, premium, board_limit, first_seen_at, last_seen_at, last_login_at)
    VALUES (?, '', 0, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET board_limit = excluded.board_limit`)
    .bind(body.userId, body.boardLimit, now, now, now).run();
  await db.prepare(`INSERT INTO admin_actions
    (admin_user_id, target_user_id, action, created_at) VALUES (?, ?, ?, ?)`)
    .bind(auth.user.id, body.userId, "board_limit_changed", now)
    .run();
  return Response.json({ ok: true });
}
