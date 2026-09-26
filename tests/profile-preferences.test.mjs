import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { ANIMATED_AVATARS, isAvatarEmoji } from "../lib/avatar-emojis.ts";
import { cleanSitePreferences } from "../lib/site-preferences.ts";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

test("accepts every bundled animated avatar and rejects unknown identifiers", () => {
  assert.equal(ANIMATED_AVATARS.length, 114);
  assert.ok(ANIMATED_AVATARS.every(isAvatarEmoji));
  assert.equal(isAvatarEmoji("lani:17"), false);
  assert.equal(isAvatarEmoji("lani:20"), false);
  assert.equal(isAvatarEmoji("lani:999"), false);
});

test("every selectable animated avatar contains multiple frames", async () => {
  for (const avatar of ANIMATED_AVATARS) {
    const number = avatar.slice("lani:".length);
    const file = fileURLToPath(new URL(`../public/avatar-emotions/lani-${number}.webp`, import.meta.url));
    const metadata = await sharp(file, { animated: true }).metadata();
    assert.ok((metadata.pages ?? 1) > 1, `${avatar} must be animated`);
  }
});

test("validates the complete cross-device appearance payload", () => {
  const preferences = {
    theme: "light", accent: "violet", reaction: "fireworks",
    siteStyle: "animals", styleMotion: false, taskGifs: true,
  };
  assert.deepEqual(cleanSitePreferences(preferences), preferences);
  assert.equal(cleanSitePreferences({ ...preferences, theme: "system" }), null);
  assert.equal(cleanSitePreferences({ ...preferences, taskGifs: "yes" }), null);
});

test("stores one preference document per user", async () => {
  const migration = await readFile(new URL("../drizzle/0010_user_preferences.sql", import.meta.url), "utf8");
  const db = new Database(":memory:");
  db.exec(migration.replaceAll("--> statement-breakpoint", ""));
  db.prepare("INSERT INTO user_preferences(user_id, preferences_json, updated_at) VALUES(?, ?, ?)")
    .run("student", '{"theme":"dark"}', 1);
  db.prepare("UPDATE user_preferences SET preferences_json = ?, updated_at = ? WHERE user_id = ?")
    .run('{"theme":"light"}', 2, "student");
  assert.deepEqual(db.prepare("SELECT preferences_json, updated_at FROM user_preferences WHERE user_id = ?").get("student"), {
    preferences_json: '{"theme":"light"}', updated_at: 2,
  });
});

test("flushes the current appearance before logout without resetting it", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const logout = page.slice(page.indexOf("const logout = async"), page.indexOf("const profile = ("));
  assert.match(logout, /action: "set_preferences", preferences: preferencesRef\.current/);
  assert.match(logout, /await fetch\("\/api\/auth\/logout"/);
  assert.doesNotMatch(logout, /siteStyle: "base"/);
});
