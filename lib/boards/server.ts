import { authenticatedUser, communityDb } from "@/lib/community-server";
import type { AppUser } from "@/lib/app-user";
import type { BoardAccess, BoardBackground, BoardPermission, BoardSummary } from "./types";

type BoardRow = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  title: string;
  background_type: BoardBackground;
  background_color: string;
  latest_sequence: number;
  storage_bytes: number;
  object_count: number;
  stroke_count: number;
  created_at: number;
  updated_at: number;
};

let boardSchemaReady: Promise<void> | null = null;
const BOARD_OBJECT_KINDS = "'stroke', 'text', 'line', 'arrow', 'rectangle', 'ellipse', 'star', 'image', 'code', 'task', 'file'";

function boardObjectsTableSql(table = "board_objects") {
  return `CREATE TABLE ${table} (
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      object_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN (${BOARD_OBJECT_KINDS})),
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
    )`;
}

export const BOARD_ASSET_LIMIT = 100 * 1024 * 1024;
export const BOARD_MAX_PARTICIPANTS = 6;
export const DEFAULT_BOARD_LIMIT = 3;

export class BoardLimitError extends Error {
  constructor(public readonly limit: number) {
    super(`Можно создать не больше ${limit} досок`);
    this.name = "BoardLimitError";
  }
}

function createStatements() {
  const db = communityDb();
  return [
    db.prepare(`CREATE TABLE IF NOT EXISTS user_access (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      premium INTEGER NOT NULL DEFAULT 0,
      board_limit INTEGER NOT NULL DEFAULT 3,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      last_login_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS boards (
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
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS board_share_links (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      permission TEXT NOT NULL CHECK(permission IN ('view', 'edit')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      revoked_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS board_invitations (
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      share_link_id TEXT NOT NULL REFERENCES board_share_links(id) ON DELETE CASCADE,
      PRIMARY KEY (board_id, user_id)
    )`),
    db.prepare(boardObjectsTableSql("IF NOT EXISTS board_objects")),
    db.prepare(`CREATE TABLE IF NOT EXISTS board_operations (
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
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS board_snapshots (
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
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS board_assets (
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
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS boards_owner_updated_idx ON boards(owner_user_id, updated_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS boards_active_updated_idx ON boards(updated_at DESC) WHERE deleted_at IS NULL"),
    db.prepare("CREATE INDEX IF NOT EXISTS board_share_links_board_active_idx ON board_share_links(board_id, revoked_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS board_share_links_token_unique ON board_share_links(token_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS board_objects_board_z_idx ON board_objects(board_id, z_index)"),
    db.prepare("CREATE INDEX IF NOT EXISTS board_objects_board_bounds_idx ON board_objects(board_id, min_x, max_x, min_y, max_y)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS board_operations_board_operation_unique ON board_operations(board_id, operation_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS board_operations_board_created_idx ON board_operations(board_id, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS board_snapshots_board_sequence_unique ON board_snapshots(board_id, sequence)"),
    db.prepare("CREATE INDEX IF NOT EXISTS board_snapshots_expiry_idx ON board_snapshots(expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS board_assets_board_created_idx ON board_assets(board_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS board_assets_storage_key_idx ON board_assets(storage_key)"),
  ];
}

export function ensureBoardSchema() {
  if (boardSchemaReady) return boardSchemaReady;
  const db = communityDb();
  boardSchemaReady = db.batch(createStatements())
    .then(async () => {
      const objectTable = await db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'board_objects'").first<{ sql: string }>();
      if (objectTable?.sql && (!objectTable.sql.includes("'task'") || !objectTable.sql.includes("'file'") || !objectTable.sql.includes("'star'"))) {
        await db.batch([
          db.prepare("ALTER TABLE board_objects RENAME TO board_objects_legacy_kinds"),
          db.prepare(boardObjectsTableSql()),
          db.prepare(`INSERT INTO board_objects (board_id, object_id, kind, version, z_index, min_x, min_y, max_x, max_y, payload_json, stroke_data, created_by, created_at, updated_at, deleted_at)
            SELECT board_id, object_id, kind, version, z_index, min_x, min_y, max_x, max_y, payload_json, stroke_data, created_by, created_at, updated_at, deleted_at FROM board_objects_legacy_kinds`),
          db.prepare("DROP TABLE board_objects_legacy_kinds"),
          db.prepare("CREATE INDEX board_objects_board_z_idx ON board_objects(board_id, z_index)"),
          db.prepare("CREATE INDEX board_objects_board_bounds_idx ON board_objects(board_id, min_x, max_x, min_y, max_y)"),
        ]);
      }
      const columns = await db.prepare("PRAGMA table_info(user_access)").all<{ name: string }>();
      if (!columns.results.some((column) => column.name === "board_limit")) {
        await db.prepare("ALTER TABLE user_access ADD COLUMN board_limit INTEGER NOT NULL DEFAULT 3").run();
      }
      await db.prepare(`CREATE TRIGGER IF NOT EXISTS boards_owner_limit_insert
        BEFORE INSERT ON boards FOR EACH ROW
        WHEN (SELECT COUNT(*) FROM boards WHERE owner_user_id = NEW.owner_user_id AND deleted_at IS NULL)
          >= COALESCE((SELECT board_limit FROM user_access WHERE user_id = NEW.owner_user_id), 3)
        BEGIN SELECT RAISE(ABORT, 'BOARD_LIMIT_REACHED'); END`).run();
    })
    .catch((error: unknown) => {
      boardSchemaReady = null;
      throw error;
    });
  return boardSchemaReady;
}

function randomHex(bytes: number) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function newBoardId() {
  return `brd_${randomHex(12)}`;
}

export function newBoardObjectId() {
  return `obj_${randomHex(12)}`;
}

export function validBoardId(value: string) {
  return /^brd_[a-f0-9]{24}$/.test(value);
}

export function cleanBoardTitle(value: unknown) {
  const title = typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100)
    : "";
  return title || "Новая доска";
}

export function cleanGuestName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 32);
}

export function cleanBackground(value: unknown): BoardBackground | null {
  return value === "plain" || value === "dots" || value === "grid" || value === "ruled" ? value : null;
}

export function cleanBoardColor(value: unknown) {
  if (typeof value !== "string") return null;
  const color = value.toLowerCase();
  return color === "#f5f0e4" || color === "#171613" ? color : null;
}

function boardSummary(row: BoardRow): BoardSummary {
  return {
    id: row.id,
    title: row.title,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name || "Владелец доски",
    backgroundType: cleanBackground(row.background_type) ?? "plain",
    backgroundColor: row.background_color.toLowerCase() === "#171613" ? "#171613" : "#f5f0e4",
    latestSequence: Number(row.latest_sequence),
    storageBytes: Number(row.storage_bytes),
    objectCount: Number(row.object_count),
    strokeCount: Number(row.stroke_count),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

const BOARD_SELECT = `SELECT b.*,
  COALESCE(NULLIF(p.display_name, ''), NULLIF(a.name, ''), NULLIF(a.email, ''), '') AS owner_name
  FROM boards b
  LEFT JOIN profiles p ON p.user_id = b.owner_user_id
  LEFT JOIN auth_users a ON a.id = b.owner_user_id`;

export async function listOwnedBoards(userId: string, search = "") {
  await ensureBoardSchema();
  const normalized = search.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 100);
  const query = normalized
    ? `${BOARD_SELECT} WHERE b.owner_user_id = ? AND b.deleted_at IS NULL AND lower(b.title) LIKE lower(?) ORDER BY b.updated_at DESC`
    : `${BOARD_SELECT} WHERE b.owner_user_id = ? AND b.deleted_at IS NULL ORDER BY b.updated_at DESC`;
  const result = normalized
    ? await communityDb().prepare(query).bind(userId, `%${normalized}%`).all<BoardRow>()
    : await communityDb().prepare(query).bind(userId).all<BoardRow>();
  return result.results.map(boardSummary);
}

export async function listInvitedBoards(userId: string) {
  await ensureBoardSchema();
  const result = await communityDb().prepare(`${BOARD_SELECT}
    JOIN board_invitations i ON i.board_id = b.id
    JOIN board_share_links l ON l.id = i.share_link_id AND l.board_id = b.id
    WHERE i.user_id = ? AND b.owner_user_id != ? AND b.deleted_at IS NULL
      AND l.revoked_at IS NULL ORDER BY b.updated_at DESC`)
    .bind(userId, userId).all<BoardRow>();
  return result.results.map(boardSummary);
}

export async function boardQuota(userId: string) {
  await ensureBoardSchema();
  const [access, usage] = await Promise.all([
    communityDb().prepare("SELECT board_limit FROM user_access WHERE user_id = ?")
      .bind(userId).first<{ board_limit: number }>(),
    communityDb().prepare("SELECT COUNT(*) AS count FROM boards WHERE owner_user_id = ? AND deleted_at IS NULL")
      .bind(userId).first<{ count: number }>(),
  ]);
  const limit = Math.max(0, Math.min(100, Math.round(Number(access?.board_limit ?? DEFAULT_BOARD_LIMIT))));
  return { used: Number(usage?.count ?? 0), limit };
}

async function assertBoardSlot(userId: string) {
  const quota = await boardQuota(userId);
  if (quota.used >= quota.limit) throw new BoardLimitError(quota.limit);
}

function normalizeBoardLimitError(error: unknown, userId: string): Promise<never> {
  if (error instanceof BoardLimitError) return Promise.reject(error);
  if (error instanceof Error && error.message.includes("BOARD_LIMIT_REACHED")) {
    return boardQuota(userId).then((quota) => Promise.reject(new BoardLimitError(quota.limit)));
  }
  return Promise.reject(error);
}

export async function createBoard(user: AppUser, title?: unknown) {
  await ensureBoardSchema();
  await assertBoardSlot(user.id);
  const id = newBoardId();
  const now = Math.floor(Date.now() / 1000);
  try {
    await communityDb().prepare(`INSERT INTO boards
      (id, owner_user_id, title, background_type, background_color, latest_sequence,
       storage_bytes, object_count, stroke_count, created_at, updated_at)
      VALUES (?, ?, ?, 'plain', '#f5f0e4', 0, 0, 0, 0, ?, ?)`)
      .bind(id, user.id, cleanBoardTitle(title), now, now)
      .run();
  } catch (error) { return normalizeBoardLimitError(error, user.id); }
  const row = await getBoardRow(id);
  if (!row) throw new Error("Не удалось создать доску");
  return boardSummary(row);
}

async function getBoardRow(boardId: string) {
  if (!validBoardId(boardId)) return null;
  return communityDb().prepare(`${BOARD_SELECT} WHERE b.id = ? AND b.deleted_at IS NULL`)
    .bind(boardId)
    .first<BoardRow>();
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function shareTokenFromRequest(request: Request) {
  const header = request.headers.get("x-board-share")?.trim();
  if (header) return header;
  return new URL(request.url).searchParams.get("share")?.trim() ?? "";
}

export async function resolveBoardAccess(request: Request, boardId: string, explicitShareToken?: string): Promise<BoardAccess | null> {
  await ensureBoardSchema();
  const row = await getBoardRow(boardId);
  if (!row) return null;
  const user = await authenticatedUser(request);
  if (user?.id === row.owner_user_id) {
    return { board: boardSummary(row), permission: "edit", owner: true, userId: user.id };
  }
  const token = explicitShareToken ?? shareTokenFromRequest(request);
  if (token && !/^[a-f0-9]{64}$/.test(token)) return null;
  const link = token
    ? await communityDb().prepare(`SELECT id, permission FROM board_share_links
        WHERE board_id = ? AND token_hash = ? AND revoked_at IS NULL LIMIT 1`)
        .bind(boardId, await sha256(token)).first<{ id: string; permission: BoardPermission }>()
    : user ? await communityDb().prepare(`SELECT l.id, l.permission FROM board_invitations i
        JOIN board_share_links l ON l.id = i.share_link_id AND l.board_id = i.board_id
        WHERE i.board_id = ? AND i.user_id = ? AND l.revoked_at IS NULL`)
        .bind(boardId, user.id).first<{ id: string; permission: BoardPermission }>() : null;
  if (!link) return null;
  if (token && user) {
    await communityDb().prepare(`INSERT INTO board_invitations (board_id, user_id, share_link_id)
      VALUES (?, ?, ?) ON CONFLICT(board_id, user_id) DO UPDATE SET share_link_id = excluded.share_link_id`)
      .bind(boardId, user.id, link.id).run();
  }
  return {
    board: boardSummary(row),
    permission: link.permission,
    owner: false,
    userId: user?.id ?? null,
  };
}

export async function requireBoardOwner(request: Request, boardId: string) {
  const access = await resolveBoardAccess(request, boardId, "");
  return access?.owner ? access : null;
}

export async function updateBoardMetadata(
  boardId: string,
  values: { title?: unknown; backgroundType?: unknown; backgroundColor?: unknown },
) {
  const current = await getBoardRow(boardId);
  if (!current) return null;
  const title = values.title === undefined ? current.title : cleanBoardTitle(values.title);
  const backgroundType = values.backgroundType === undefined
    ? current.background_type
    : cleanBackground(values.backgroundType);
  const backgroundColor = values.backgroundColor === undefined
    ? current.background_color
    : cleanBoardColor(values.backgroundColor);
  if (!backgroundType || !backgroundColor) throw new Error("Некорректные настройки фона");
  const now = Math.floor(Date.now() / 1000);
  await communityDb().prepare(`UPDATE boards SET title = ?, background_type = ?, background_color = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL`)
    .bind(title, backgroundType, backgroundColor, now, boardId)
    .run();
  const updated = await getBoardRow(boardId);
  return updated ? boardSummary(updated) : null;
}

export async function softDeleteBoard(boardId: string) {
  const now = Math.floor(Date.now() / 1000);
  await communityDb().batch([
    communityDb().prepare("UPDATE boards SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
      .bind(now, now, boardId),
    communityDb().prepare("UPDATE board_share_links SET revoked_at = ?, updated_at = ? WHERE board_id = ? AND revoked_at IS NULL")
      .bind(now, now, boardId),
  ]);
}

export async function duplicateBoard(sourceId: string, ownerId: string) {
  await ensureBoardSchema();
  const source = await getBoardRow(sourceId);
  if (!source || source.owner_user_id !== ownerId) return null;
  await assertBoardSlot(ownerId);
  const id = newBoardId();
  const now = Math.floor(Date.now() / 1000);
  try { await communityDb().batch([
    communityDb().prepare(`INSERT INTO boards
      (id, owner_user_id, title, background_type, background_color, latest_sequence,
       storage_bytes, object_count, stroke_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`)
      .bind(id, ownerId, `${source.title} — копия`.slice(0, 100), source.background_type,
        source.background_color, source.storage_bytes, source.object_count, source.stroke_count, now, now),
    communityDb().prepare(`INSERT INTO board_objects
      (board_id, object_id, kind, version, z_index, min_x, min_y, max_x, max_y,
       payload_json, stroke_data, created_by, created_at, updated_at, deleted_at)
      SELECT ?, object_id, kind, version, z_index, min_x, min_y, max_x, max_y,
       payload_json, stroke_data, ?, ?, ?, NULL
      FROM board_objects WHERE board_id = ? AND deleted_at IS NULL`)
      .bind(id, ownerId, now, now, sourceId),
    communityDb().prepare(`INSERT INTO board_assets
      (board_id, id, storage_key, thumbnail_key, content_type, width, height, size,
       sha256, uploaded_by, created_at, deleted_at)
      SELECT ?, id, storage_key, thumbnail_key, content_type, width, height, size,
       sha256, ?, ?, NULL FROM board_assets WHERE board_id = ? AND deleted_at IS NULL`)
      .bind(id, ownerId, now, sourceId),
  ]); } catch (error) { return normalizeBoardLimitError(error, ownerId); }
  const row = await getBoardRow(id);
  return row ? boardSummary(row) : null;
}

export async function shareStatus(boardId: string) {
  await ensureBoardSchema();
  return communityDb().prepare(`SELECT permission, updated_at FROM board_share_links
    WHERE board_id = ? AND revoked_at IS NULL ORDER BY updated_at DESC LIMIT 1`)
    .bind(boardId)
    .first<{ permission: BoardPermission; updated_at: number }>();
}

export async function rotateBoardShare(boardId: string, permission: BoardPermission | null) {
  await ensureBoardSchema();
  const now = Math.floor(Date.now() / 1000);
  const revoke = communityDb().prepare(`UPDATE board_share_links SET revoked_at = ?, updated_at = ?
    WHERE board_id = ? AND revoked_at IS NULL`).bind(now, now, boardId);
  if (!permission) {
    await revoke.run();
    return null;
  }
  const token = randomHex(32);
  await communityDb().batch([
    revoke,
    communityDb().prepare(`INSERT INTO board_share_links
      (id, board_id, token_hash, permission, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(`shr_${randomHex(12)}`, boardId, await sha256(token), permission, now, now),
  ]);
  return { token, permission };
}

export function userDisplayName(user: AppUser) {
  return String(
    user.user_metadata.full_name
      ?? user.user_metadata.name
      ?? user.email?.split("@")[0]
      ?? "Участник",
  ).trim().slice(0, 32) || "Участник";
}
