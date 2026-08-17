import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";

type BoundStatement = {
  sql: string;
  values: unknown[];
  bind: (...values: unknown[]) => BoundStatement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  run: () => Promise<{ meta: { changes: number; last_row_id: number | bigint } }>;
};

const dataRoot = resolve(process.env.DATA_DIR || join(process.cwd(), "data"));
const uploadsRoot = join(dataRoot, "uploads");
mkdirSync(uploadsRoot, { recursive: true });

const sqlite = new Database(process.env.SQLITE_PATH || join(dataRoot, "egege.sqlite"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_emoji TEXT NOT NULL DEFAULT '🙂',
    xp INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    suspicion_score INTEGER NOT NULL DEFAULT 0,
    rate_limited_until INTEGER NOT NULL DEFAULT 0,
    last_award_at INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS profiles_xp_idx ON profiles(xp);
  CREATE TABLE IF NOT EXISTS score_events (
    user_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    date_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, task_id)
  );
  CREATE INDEX IF NOT EXISTS score_events_user_created_idx ON score_events(user_id, created_at);
  CREATE INDEX IF NOT EXISTS score_events_user_date_idx ON score_events(user_id, date_key);
  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair_key TEXT NOT NULL UNIQUE,
    requester_id TEXT NOT NULL,
    addressee_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships(requester_id, status);
  CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships(addressee_id, status);
`);

function statement(sql: string, values: unknown[] = []): BoundStatement {
  return {
    sql,
    values,
    bind: (...nextValues) => statement(sql, nextValues),
    async first<T>() {
      return (sqlite.prepare(sql).get(...values) as T | undefined) ?? null;
    },
    async all<T>() {
      return { results: sqlite.prepare(sql).all(...values) as T[] };
    },
    async run() {
      const result = sqlite.prepare(sql).run(...values);
      return { meta: { changes: result.changes, last_row_id: result.lastInsertRowid } };
    },
  };
}

const DB = {
  prepare: (sql: string) => statement(sql),
  async batch(statements: BoundStatement[]) {
    const execute = sqlite.transaction(() => statements.map((item) => {
      const result = sqlite.prepare(item.sql).run(...item.values);
      return { meta: { changes: result.changes, last_row_id: result.lastInsertRowid } };
    }));
    return execute();
  },
};

function safeObjectPath(key: string) {
  const cleaned = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
  const target = resolve(uploadsRoot, cleaned);
  if (target !== uploadsRoot && !target.startsWith(`${uploadsRoot}/`)) throw new Error("Unsafe storage key");
  return target;
}

function metadataPath(path: string) {
  return `${path}.meta.json`;
}

function contentTypeFor(path: string) {
  const types: Record<string, string> = {
    ".gif": "image/gif", ".html": "text/html; charset=utf-8", ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg", ".json": "application/json; charset=utf-8", ".png": "image/png",
    ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".webp": "image/webp",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return types[extname(path).toLowerCase()] || "application/octet-stream";
}

function objectResponse(path: string, range?: { offset: number; length: number }) {
  const bytes = readFileSync(path);
  const selected = range ? bytes.subarray(range.offset, range.offset + range.length) : bytes;
  let metadata: { contentType?: string } = {};
  try { metadata = JSON.parse(readFileSync(metadataPath(path), "utf8")); } catch { /* optional */ }
  const contentType = metadata.contentType || contentTypeFor(path);
  return {
    body: new Blob([selected], { type: contentType }).stream(),
    size: bytes.length,
    httpEtag: `"${createHash("sha256").update(bytes).digest("hex")}"`,
    httpMetadata: { contentType },
    writeHttpMetadata(headers: Headers) { headers.set("content-type", contentType); },
  };
}

const FILES = {
  async head(key: string) {
    const path = safeObjectPath(key);
    try {
      const object = objectResponse(path);
      return { size: object.size, httpEtag: object.httpEtag, httpMetadata: object.httpMetadata };
    } catch { return null; }
  },
  async get(key: string, options?: { range?: { offset: number; length: number } }) {
    try { return objectResponse(safeObjectPath(key), options?.range); } catch { return null; }
  },
  async put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView, options?: { httpMetadata?: { contentType?: string } }) {
    const path = safeObjectPath(key);
    mkdirSync(dirname(path), { recursive: true });
    const bytes = value instanceof ReadableStream
      ? Buffer.from(await new Response(value).arrayBuffer())
      : ArrayBuffer.isView(value)
        ? Buffer.from(value.buffer, value.byteOffset, value.byteLength)
        : Buffer.from(value);
    writeFileSync(path, bytes);
    writeFileSync(metadataPath(path), JSON.stringify(options?.httpMetadata ?? {}));
    return { key };
  },
  async delete(key: string) {
    const path = safeObjectPath(key);
    try { unlinkSync(path); } catch { /* already absent */ }
    try { unlinkSync(metadataPath(path)); } catch { /* already absent */ }
  },
};

const ASSETS = {
  async fetch(request: Request) {
    const path = resolve(process.cwd(), "public", new URL(request.url).pathname.replace(/^\/+/, ""));
    const publicRoot = resolve(process.cwd(), "public");
    if (!path.startsWith(`${publicRoot}/`)) return new Response("Not found", { status: 404 });
    try {
      const info = statSync(path);
      if (!info.isFile()) return new Response("Not found", { status: 404 });
      return new Response(readFileSync(path), { headers: { "content-type": contentTypeFor(path) } });
    } catch { return new Response("Not found", { status: 404 }); }
  },
};

export const env = { DB, FILES, ASSETS };
