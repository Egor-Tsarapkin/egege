CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  background_type TEXT NOT NULL DEFAULT 'plain' CHECK(background_type IN ('plain', 'dots', 'grid', 'ruled')),
  background_color TEXT NOT NULL DEFAULT '#f5f0e4',
  latest_sequence INTEGER NOT NULL DEFAULT 0,
  storage_bytes INTEGER NOT NULL DEFAULT 0,
  object_count INTEGER NOT NULL DEFAULT 0,
  stroke_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS boards_owner_updated_idx ON boards(owner_user_id, updated_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS boards_active_updated_idx ON boards(updated_at DESC) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS board_share_links (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  permission TEXT NOT NULL CHECK(permission IN ('view', 'edit')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revoked_at INTEGER
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS board_share_links_board_active_idx ON board_share_links(board_id, revoked_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS board_objects (
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('stroke', 'text', 'line', 'arrow', 'rectangle', 'ellipse', 'image', 'code')),
  version INTEGER NOT NULL DEFAULT 1,
  z_index INTEGER NOT NULL DEFAULT 0,
  min_x INTEGER NOT NULL,
  min_y INTEGER NOT NULL,
  max_x INTEGER NOT NULL,
  max_y INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  stroke_data BLOB,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (board_id, object_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS board_objects_board_z_idx ON board_objects(board_id, z_index);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS board_objects_board_bounds_idx ON board_objects(board_id, min_x, max_x, min_y, max_y);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS board_operations (
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  operation_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK(actor_kind IN ('user', 'guest', 'system')),
  operation_type TEXT NOT NULL,
  target_object_id TEXT,
  payload BLOB NOT NULL,
  inverse_payload BLOB,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (board_id, sequence),
  UNIQUE (board_id, operation_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS board_operations_board_created_idx ON board_operations(board_id, created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS board_snapshots (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  payload BLOB NOT NULL,
  object_count INTEGER NOT NULL DEFAULT 0,
  stroke_count INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL CHECK(reason IN ('periodic', 'before_restore', 'manual_restore')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE (board_id, sequence)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS board_snapshots_expiry_idx ON board_snapshots(expires_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS board_assets (
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  thumbnail_key TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (board_id, id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS board_assets_board_created_idx ON board_assets(board_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS board_assets_storage_key_idx ON board_assets(storage_key);
