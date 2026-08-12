import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the teacher workspace into the site", async () => {
  const [page, studio, schema, migration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/teacher-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0002_needy_sandman.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /\u041c\u043e\u0438 \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u044b/);
  assert.match(page, /\u041c\u043e\u0438 \u0437\u0430\u0434\u0430\u043d\u0438\u044f/);
  assert.match(studio, /\u0421\u043e\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u0440\u0438\u0430\u043d\u0442 \u043f\u043e ID/);
  assert.match(studio, /contentEditable/);
  assert.match(studio, /onDragStart/);
  assert.match(studio, /\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u0430/);
  assert.match(schema, /teacherVariantAttempts/);
  assert.match(migration, /CREATE TABLE `teacher_tasks`/);
  assert.match(migration, /CREATE TABLE `teacher_variants`/);
  await access(new URL("../dist/server/index.js", import.meta.url));
});

test("keeps generated IDs separate from imported KIMs and tasks", async () => {
  const [server, route] = await Promise.all([
    readFile(new URL("../lib/teacher-studio-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/teacher-studio/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(server, /`0\$\{String\(rowId\)\.padStart\(5, "0"\)\}`/);
  assert.match(server, /`0\$\{String\(rowId\)\.padStart\(7, "0"\)\}`/);
  assert.match(server, /\^0\\d\{7\}\$/);
  assert.match(route, /nextAvailableTaskId/);
  assert.match(route, /NOT EXISTS \(SELECT 1 FROM teacher_tasks WHERE public_id = '000001'\)/);
});
