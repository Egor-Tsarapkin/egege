import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("creates a standalone VPS build and deployment files", async () => {
  await Promise.all([
    access(new URL("../.next/standalone/server.js", import.meta.url)),
    access(new URL("../Dockerfile", import.meta.url)),
    access(new URL("../docker-compose.yml", import.meta.url)),
    access(new URL("../.env.example", import.meta.url)),
  ]);
});

test("keeps administrator access explicit", async () => {
  const admin = await readFile(new URL("../lib/admin-server.ts", import.meta.url), "utf8");
  assert.doesNotMatch(admin, /ORDER BY created_at ASC LIMIT 1/);
  assert.match(admin, /emails\.length > 0/);
});

test("streams task files from the allowed authoritative host", async () => {
  const route = await readFile(new URL("../app/api/task-file/route.ts", import.meta.url), "utf8");
  assert.match(route, /source\.hostname !== "kompege\.ru"/);
  assert.doesNotMatch(route, /bucket\.head/);
});

test("includes the privacy consent migration", async () => {
  const migration = await readFile(new URL("../drizzle/0004_privacy_consents.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS privacy_consents/);
});
