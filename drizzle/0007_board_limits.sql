ALTER TABLE user_access ADD COLUMN board_limit INTEGER NOT NULL DEFAULT 3;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS boards_owner_limit_insert
BEFORE INSERT ON boards
FOR EACH ROW
WHEN (
  SELECT COUNT(*) FROM boards
  WHERE owner_user_id = NEW.owner_user_id AND deleted_at IS NULL
) >= COALESCE((
  SELECT board_limit FROM user_access WHERE user_id = NEW.owner_user_id
), 3)
BEGIN
  SELECT RAISE(ABORT, 'BOARD_LIMIT_REACHED');
END;
