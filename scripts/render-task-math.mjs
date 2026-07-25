import { readFile, writeFile } from "node:fs/promises";
import katex from "katex";

const dataPath = new URL("../public/data/kompege-tasks.json", import.meta.url);
const tasks = JSON.parse(await readFile(dataPath, "utf8"));
let renderedCount = 0;
let failedCount = 0;

function decodeFormula(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function renderFormula(source) {
  const formula = decodeFormula(source);
  const displayMode =
    formula.length > 42 ||
    /\\(?:frac|dfrac|sqrt|sum|prod|int|begin)\b/.test(formula);

  try {
    const rendered = katex.renderToString(formula, {
      displayMode,
      output: "htmlAndMathml",
      strict: "ignore",
      throwOnError: true,
      trust: false,
    });
    renderedCount += 1;
    return displayMode
      ? `<span class="task-formula task-formula-display">${rendered}</span>`
      : `<span class="task-formula task-formula-inline">${rendered}</span>`;
  } catch (error) {
    failedCount += 1;
    console.warn(`Could not render formula: ${formula}`, error.message);
    return `<code class="task-formula-error">${formula}</code>`;
  }
}

for (const task of tasks) {
  if (task.html.includes('class="task-formula')) continue;

  task.html = task.html
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula) => renderFormula(formula))
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => renderFormula(formula))
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula) => renderFormula(formula));
}

await writeFile(dataPath, `${JSON.stringify(tasks, null, 2)}\n`);
console.log(`Rendered ${renderedCount} formulas; failures: ${failedCount}`);
