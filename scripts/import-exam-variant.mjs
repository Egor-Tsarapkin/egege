import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const kim = process.argv[2] ?? "25135392";
const outputPath = resolve(
  process.cwd(),
  process.argv[3] ?? `public/data/variants/${kim}.json`,
);

const response = await fetch(`https://kompege.ru/api/v1/variant/kim/${kim}`);

if (!response.ok) {
  throw new Error(`КЕГЭ вернул ${response.status} для КИМ ${kim}`);
}

const source = await response.json();
const payload = {
  kim: String(source.kim),
  title: source.description || `КИМ № ${source.kim}`,
  sourceUrl: `https://kompege.ru/variant?kim=${source.kim}`,
  importedAt: new Date().toISOString(),
  tasks: source.tasks.map((task) => ({
    id: String(task.taskId),
    number: Number(task.number),
    html: task.text,
    table: {
      cols: Number(task.table?.cols ?? 1),
      rows: Number(task.table?.rows ?? 1),
    },
    files: (task.files ?? []).map((file) => ({
      name: file.name,
      href: new URL(file.url, "https://kompege.ru").href,
    })),
  })),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Импортирован КИМ ${kim}: ${payload.tasks.length} заданий`);
