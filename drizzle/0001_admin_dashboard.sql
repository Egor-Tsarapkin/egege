CREATE TABLE IF NOT EXISTS user_access (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  premium INTEGER NOT NULL DEFAULT 0,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  path TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  active_seconds INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS exam_attempts (
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
);
CREATE TABLE IF NOT EXISTS admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS analytics_sessions_seen_idx ON analytics_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS analytics_events_type_created_idx ON analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS exam_attempts_user_idx ON exam_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS admin_actions_created_idx ON admin_actions(created_at);
