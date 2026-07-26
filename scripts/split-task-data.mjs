import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const sourceUrl = new URL("../public/data/kompege-tasks.json", import.meta.url);
const taskDirectoryUrl = new URL("../public/data/tasks/", import.meta.url);
const taskIndexUrl = new URL("../public/data/task-index.json", import.meta.url);
const variantTasksUrl = new URL("../public/data/variant-tasks.json", import.meta.url);
const variantTaskIds = new Set(["31347", "31350", "31354", "31363", "31370"]);

export async function splitTaskData() {
  const tasks = JSON.parse(await readFile(sourceUrl, "utf8"));
  await mkdir(taskDirectoryUrl, { recursive: true });

  await Promise.all(
    Array.from({ length: 27 }, async (_, index) => {
      const number = index + 1;
      const tasksForNumber = tasks.filter((task) => task.number === number);
      await writeFile(
        new URL(`${number}.json`, taskDirectoryUrl),
        `${JSON.stringify(tasksForNumber)}\n`,
      );
    }),
  );

  const taskIndex = Object.fromEntries(tasks.map((task) => [task.id, task.number]));
  await writeFile(taskIndexUrl, `${JSON.stringify(taskIndex)}\n`);

  const variantTasks = tasks.filter((task) => variantTaskIds.has(task.id));
  await writeFile(variantTasksUrl, `${JSON.stringify(variantTasks)}\n`);

  return { tasks: tasks.length, variants: variantTasks.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await splitTaskData();
  console.log(`Split ${result.tasks} tasks; prepared ${result.variants} variant tasks`);
}
