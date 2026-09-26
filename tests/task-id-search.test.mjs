import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("real KEGE ID 31120 wins over a synthetic game-part ID", async () => {
  const index = JSON.parse(await readFile(new URL("../public/data/task-index.json", import.meta.url), "utf8"));
  const tasks = JSON.parse(await readFile(new URL(`../public/data/tasks/${index["31120"]}.json`, import.meta.url), "utf8"));
  const task = tasks.find((item) => item.id === "31120");
  assert.equal(index["31120"], 10);
  assert.equal(task.parentId, undefined);
  assert.equal(String(task.answer), "642");
});

test("task search uses an exact ID and board insertion accepts short IDs", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/boards/tasks/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /task\.id === normalizedSearch/);
  assert.doesNotMatch(page, /task\.id\.includes\(normalizedSearch\)/);
  assert.match(route, /\/\^\\d\{1,20\}\$\//);
});
