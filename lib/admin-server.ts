import type { User } from "@supabase/supabase-js";
import { communityDb, ensureCommunityProfile } from "@/lib/community-server";

let schemaReady: Promise<void> | null = null;

export function ensureAdminSchema() {
  if (schemaReady) return schemaReady;
  const db = communityDb();
  schemaReady = db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS user_access (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      premium INTEGER NOT NULL DEFAULT 0,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      last_login_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS analytics_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT,
      path TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      active_seconds INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      user_id TEXT,
      event_type TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS exam_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kim TEXT NOT NULL,
      title TEXT NOT NULL,
      test_score INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      answered_count INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS analytics_sessions_seen_idx ON analytics_sessions(last_seen_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS analytics_events_type_created_idx ON analytics_events(event_type, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS exam_attempts_user_idx ON exam_attempts(user_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS admin_actions_created_idx ON admin_actions(created_at)"),
  ]).then(() => undefined).catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

function configuredAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminUser(user: User) {
  const emails = configuredAdminEmails();
  const email = user.email?.toLowerCase() ?? "";
  if (emails.length) return emails.includes(email);

  // Без переменной окружения первым администратором становится самый ранний
  // зарегистрированный профиль. Это безопаснее, чем открывать панель всем.
  const first = await communityDb()
    .prepare("SELECT user_id FROM profiles ORDER BY created_at ASC LIMIT 1")
    .first<{ user_id: string }>();
  return first?.user_id === user.id;
}

export async function ensureUserAccess(user: User) {
  await ensureCommunityProfile(user);
  await ensureAdminSchema();
  const now = Math.floor(Date.now() / 1000);
  await communityDb()
    .prepare(`INSERT INTO user_access
      (user_id, email, premium, first_seen_at, last_seen_at, last_login_at)
      VALUES (?, ?, 0, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        email = excluded.email,
        last_seen_at = excluded.last_seen_at,
        last_login_at = excluded.last_login_at`)
    .bind(user.id, user.email ?? "", now, now, now)
    .run();
  return communityDb()
    .prepare("SELECT premium FROM user_access WHERE user_id = ?")
    .bind(user.id)
    .first<{ premium: number }>();
}

export function safeSessionId(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{12,80}$/.test(value) ? value : null;
}
