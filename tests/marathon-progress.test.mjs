import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { readFile } from "node:fs/promises";
import { QUESTIONS } from "../app/ege-marathon-data.ts";
import { cleanMarathonProgress } from "../lib/marathon-progress.ts";

test("validates account marathon progress", () => {
  const progress = {
    answered: { "ege-001": "correct", "python-002": "wrong" },
    favorites: ["ege-001"], marathonOrder: ["ege-001", "python-002"],
    autoAdvance: true, successEffect: false,
  };
  assert.deepEqual(cleanMarathonProgress(progress), progress);
  assert.equal(cleanMarathonProgress({ ...progress, answered: { unsafe: "correct" } }), null);
  assert.equal(cleanMarathonProgress({ ...progress, autoAdvance: "yes" }), null);
});

test("stores one marathon progress document per user", async () => {
  const migration = await readFile(new URL("../drizzle/0011_marathon_progress.sql", import.meta.url), "utf8");
  const db = new Database(":memory:");
  db.exec(migration.replaceAll("--> statement-breakpoint", ""));
  db.prepare("INSERT INTO marathon_progress(user_id, progress_json, updated_at) VALUES(?, ?, ?)")
    .run("student", '{"answered":{}}', 1);
  db.prepare("UPDATE marathon_progress SET progress_json = ?, updated_at = ? WHERE user_id = ?")
    .run('{"answered":{"ege-001":"correct"}}', 2, "student");
  assert.equal(db.prepare("SELECT updated_at FROM marathon_progress WHERE user_id = ?").get("student").updated_at, 2);
});

test("accepts the real Python IDs and the complete marathon queue", () => {
  const progress = {
    answered: Object.fromEntries(QUESTIONS.map((question) => [question.id, "correct"])),
    favorites: QUESTIONS.map((question) => question.id),
    marathonOrder: QUESTIONS.map((question) => question.id),
    autoAdvance: true, successEffect: false, updatedAt: 100,
  };
  assert.deepEqual(cleanMarathonProgress(progress), progress);
});
