CREATE TABLE IF NOT EXISTS board_invitations (
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  share_link_id TEXT NOT NULL REFERENCES board_share_links(id) ON DELETE CASCADE,
  PRIMARY KEY (board_id, user_id)
);
