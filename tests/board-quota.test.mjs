import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Database from "better-sqlite3";

test("enforces the default board quota in SQLite", async () => {
  const migration = await readFile(new URL("../drizzle/0007_board_limits.sql", import.meta.url), "utf8");
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE user_access (
    user_id TEXT PRIMARY KEY, email TEXT NOT NULL DEFAULT '', premium INTEGER NOT NULL DEFAULT 0,
    first_seen_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, last_login_at INTEGER NOT NULL
  );
  CREATE TABLE boards (
    id TEXT PRIMARY KEY, owner_user_id TEXT NOT NULL, deleted_at INTEGER
  );`);
  db.exec(migration.replaceAll("--> statement-breakpoint", ""));
  db.prepare("INSERT INTO user_access(user_id, first_seen_at, last_seen_at, last_login_at) VALUES('user-1', 0, 0, 0)").run();
  const insert = db.prepare("INSERT INTO boards(id, owner_user_id, deleted_at) VALUES(?, 'user-1', NULL)");
  insert.run("one"); insert.run("two"); insert.run("three");
  assert.throws(() => insert.run("four"), /BOARD_LIMIT_REACHED/);
  db.prepare("UPDATE user_access SET board_limit = 4 WHERE user_id = 'user-1'").run();
  insert.run("four");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM boards WHERE deleted_at IS NULL").get().count, 4);
});


test("publishes the boards gate and quota controls without account tiers", async () => {
  const [page, admin, boardSurface] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /section: "boards", label: "Онлайн-доска", icon: <BoardsIcon \/>, locked: authResolved && !isRegistered/);
  assert.match(page, /className="gate-preview preview-boards"/);
  assert.doesNotMatch(page, /Премиум|премиум/);
  assert.match(admin, /action: "set_board_limit"/);
  assert.match(admin, /Лимиты досок/);
  assert.match(boardSurface, /zoomAt\(viewportRef\.current, point, Math\.exp\(-deltaY \* \.008\)\)/);
  assert.match(boardSurface, /addEventListener\("wheel", wheel, \{ passive: false, capture: true \}\)/);
  assert.match(boardSurface, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(boardSurface, /onWheel=/);
  assert.match(boardSurface, /x: viewportRef\.current\.x - deltaX/);
  assert.match(boardSurface, /y: viewportRef\.current\.y - deltaY/);
  assert.doesNotMatch(boardSurface, /if \(event\.ctrlKey \|\| event\.metaKey\) return/);
});
