ALTER TABLE board_objects RENAME TO board_objects_legacy_kinds;
--> statement-breakpoint
CREATE TABLE board_objects (
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('stroke', 'text', 'line', 'arrow', 'rectangle', 'ellipse', 'star', 'image', 'code', 'task', 'file')),
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
INSERT INTO board_objects (board_id, object_id, kind, version, z_index, min_x, min_y, max_x, max_y, payload_json, stroke_data, created_by, created_at, updated_at, deleted_at)
SELECT board_id, object_id, kind, version, z_index, min_x, min_y, max_x, max_y, payload_json, stroke_data, created_by, created_at, updated_at, deleted_at FROM board_objects_legacy_kinds;
--> statement-breakpoint
DROP TABLE board_objects_legacy_kinds;
--> statement-breakpoint
CREATE INDEX board_objects_board_z_idx ON board_objects(board_id, z_index);
--> statement-breakpoint
CREATE INDEX board_objects_board_bounds_idx ON board_objects(board_id, min_x, max_x, min_y, max_y);
