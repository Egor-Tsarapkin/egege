import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import Database from "better-sqlite3";

const community = readFileSync(new URL("../app/api/community/route.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../app/api/admin/route.ts", import.meta.url), "utf8");

test("leaderboard returns top ten and current user's neighbors, including beyond rank 50", () => {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE profiles(user_id TEXT, xp INTEGER, correct_count INTEGER, created_at INTEGER);
    CREATE TABLE friendships(requester_id TEXT, addressee_id TEXT, status TEXT);
    CREATE TABLE privacy_consents(user_id TEXT, distribution_accepted_at INTEGER);`);
  for (let i = 1; i <= 80; i++) {
    db.prepare("INSERT INTO profiles VALUES (?, ?, 0, 0)").run(`u${i}`, 100 - i);
    db.prepare("INSERT INTO privacy_consents VALUES (?, 1)").run(`u${i}`);
  }
  const queries = [...community.slice(community.indexOf("const leaderboardSql"), community.indexOf("const leaderboardResult")).matchAll(/`([\s\S]*?)`/g)].map((m) => m[1]);
  const sql = queries[2].replace("${leaderboardSql}", queries[1]);
  for (const rank of [1, 9, 10, 11, 12, 15, 60, 80]) {
    const id = `u${rank}`;
    const rows = db.prepare(sql).all(id, id, id, id);
    const expected = Array.from({ length: 80 }, (_, i) => i + 1).filter((n) => n <= 10 || Math.abs(n - rank) <= 1);
    assert.deepEqual(rows.map((row) => row.rank), expected);
  }
  db.close();
});

test("daily analytics deduplicates visitors and keeps registrations on Moscow dates", () => {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE profiles(created_at INTEGER); CREATE TABLE analytics_events(created_at INTEGER,event_type TEXT,user_id TEXT,session_id TEXT); CREATE TABLE user_access(user_id TEXT,last_seen_at INTEGER);");
  const created = Date.parse("2026-09-03T22:00:00Z") / 1000;
  db.prepare("INSERT INTO profiles VALUES (?)").run(created);
  db.prepare("INSERT INTO analytics_events VALUES (?,?,?,?),(?,?,?,?),(?,?,?,?)")
    .run(created, "page_view", "student", "tab-1", created, "page_view", "student", "tab-2", created, "page_view", null, "guest-1");
  const sql = admin.match(/db\.prepare\(`(SELECT day, SUM\(visits\)[\s\S]*?)`\)/)[1];
  assert.deepEqual(db.prepare(sql).all(created - 86400, created - 86400, created - 86400), [{ day: "2026-09-04", visits: 2, registrations: 1 }]);
  db.close();
});

test("admin reads are not cached and analytics accepts configured production origin", () => {
  assert.match(admin, /Cache-Control.*private, no-store/);
  const analytics = readFileSync(new URL("../app/api/analytics/route.ts", import.meta.url), "utf8");
  assert.match(analytics, /new URL\(process.env.SITE_URL \|\| requestUrl.origin\).origin/);
});

test("today's visitors deduplicate authenticated tabs", () => {
  const db = new Database(":memory:");
  db.exec(`CREATE TABLE analytics_events(user_id TEXT, session_id TEXT, event_type TEXT, created_at INTEGER);
    INSERT INTO analytics_events VALUES ('student','tab1','page_view',1000),('student','tab2','page_view',1001),(NULL,'guest','page_view',1002),(NULL,'guest','page_view',1003);`);
  db.exec("CREATE TABLE user_access(user_id TEXT,last_seen_at INTEGER); INSERT INTO user_access VALUES ('second-student',1003)");
  const sql = admin.match(/db\.prepare\(`(SELECT COUNT\(\*\) AS value FROM \([\s\S]*?)`\)/)[1];
  assert.equal(db.prepare(sql).get(1003, 1003).value, 3);
  db.close();
});
