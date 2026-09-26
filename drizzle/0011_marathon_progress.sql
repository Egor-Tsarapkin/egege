CREATE TABLE IF NOT EXISTS marathon_progress (
  user_id TEXT PRIMARY KEY,
  progress_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);
