import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const tasksDirectory = path.join(root, "public/data/tasks");
const variantsDirectory = path.join(root, "public/data/variants");
const taskMap = new Map();

for (const name of await readdir(tasksDirectory)) {
  if (!name.endsWith(".json")) continue;
  const tasks = JSON.parse(await readFile(path.join(tasksDirectory, name), "utf8"));
  for (const task of tasks) taskMap.set(String(task.id), task);
}

let variants = 0;
let replaced = 0;

for (const name of await readdir(variantsDirectory)) {
  if (!name.endsWith(".json")) continue;
  const file = path.join(variantsDirectory, name);
  const variant = JSON.parse(await readFile(file, "utf8"));

  variant.tasks = variant.tasks.map((task) => {
    const compositeId =
      task.number === 20 || task.number === 21
        ? `${task.id}${task.number}`
        : String(task.id);
    const canonical = taskMap.get(compositeId) ?? taskMap.get(String(task.id));
    if (!canonical) return task;
    replaced += 1;
    return {
      ...task,
      html: canonical.html,
      table: canonical.table,
      files: canonical.files,
    };
  });

  await writeFile(file, JSON.stringify(variant));
  variants += 1;
}

console.log(`Synced ${replaced} tasks across ${variants} variants.`);
