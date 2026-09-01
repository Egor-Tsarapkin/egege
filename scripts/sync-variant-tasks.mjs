import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const tasksDirectory = path.join(root, "public/data/tasks");
const variantsDirectory = path.join(root, "public/data/variants");
const taskMap = new Map();
const subTaskMap = new Map();

for (const name of await readdir(tasksDirectory)) {
  if (!name.endsWith(".json")) continue;
  const tasks = JSON.parse(await readFile(path.join(tasksDirectory, name), "utf8"));
  for (const task of tasks) {
    if (task.parentId && (task.number === 20 || task.number === 21)) {
      subTaskMap.set(`${task.parentId}:${task.number}`, task);
    } else {
      taskMap.set(String(task.id), task);
    }
  }
}

let variants = 0;
let replaced = 0;

for (const name of await readdir(variantsDirectory)) {
  if (!name.endsWith(".json")) continue;
  const file = path.join(variantsDirectory, name);
  const variant = JSON.parse(await readFile(file, "utf8"));

  variant.tasks = variant.tasks.map((task) => {
    const canonical = task.number === 20 || task.number === 21
      ? subTaskMap.get(`${task.id}:${task.number}`)
      : taskMap.get(String(task.id));
    if (!canonical) return task;
    replaced += 1;
    return {
      ...task,
      number: canonical.number,
      html: canonical.html,
      answer: canonical.answer,
      table: canonical.table,
      files: canonical.files,
    };
  });

  await writeFile(file, JSON.stringify(variant));
  variants += 1;
}

console.log(`Synced ${replaced} tasks across ${variants} variants.`);
