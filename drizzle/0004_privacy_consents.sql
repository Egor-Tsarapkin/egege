CREATE TABLE IF NOT EXISTS privacy_consents (
  user_id TEXT PRIMARY KEY,
  data_version TEXT NOT NULL,
  data_accepted_at INTEGER NOT NULL,
  distribution_version TEXT NOT NULL DEFAULT '',
  distribution_accepted_at INTEGER,
  terms_version TEXT NOT NULL,
  terms_accepted_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
