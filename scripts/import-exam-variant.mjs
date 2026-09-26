import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import katex from "katex";

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

function decodeFormula(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function renderFormula(sourceFormula, displayMode) {
  const formula = decodeFormula(sourceFormula);

  try {
    const rendered = katex.renderToString(formula, {
      displayMode,
      output: "htmlAndMathml",
      strict: "ignore",
      throwOnError: true,
      trust: false,
    });

    return displayMode
      ? `<span class="task-formula task-formula-display">${rendered}</span>`
      : `<span class="task-formula task-formula-inline">${rendered}</span>`;
  } catch {
    return `<code class="task-formula-error">${formula}</code>`;
  }
}

function prepareTaskHtml(rawHtml) {
  return rawHtml
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula) => renderFormula(formula, false))
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => renderFormula(formula, true))
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula) => renderFormula(formula, true))
    .replace(/<table\b([^>]*)>/gi, '<div class="exam-table-scroll"><table$1>')
    .replace(/<\/table>/gi, "</table></div>");
}

const payload = {
  kim: String(source.kim),
  title: source.description || `КИМ № ${source.kim}`,
  sourceUrl: `https://kompege.ru/variant?kim=${source.kim}`,
  importedAt: new Date().toISOString(),
  tasks: source.tasks.map((task, index) => ({
    slot: index + 1,
    answer: String(task.key ?? task.answer ?? ""),
    id: String(task.taskId),
    number: Number(task.number),
    html: prepareTaskHtml(task.text),
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
