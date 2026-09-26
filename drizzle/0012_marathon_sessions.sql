CREATE TABLE IF NOT EXISTS marathon_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS marathon_sessions_user_idx ON marathon_sessions(user_id, last_seen_at);
