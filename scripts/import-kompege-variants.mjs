import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import katex from "katex";

const SITE_ROOT = "https://kompege.ru";
const API_ROOT = `${SITE_ROOT}/api/v1`;
const outputRoot = new URL("../public/data/variants/", import.meta.url);
const manifestUrl = new URL("../public/data/variant-manifest.json", import.meta.url);
const concurrency = 3;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url, attempts = 8) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "*/*",
          "User-Agent": "EGEGE educational importer (permission granted by source owner)",
        },
      });
      if (response.ok) return response;
      if (response.status === 404) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
      if (response.status === 429) {
        await wait(2200 * attempt);
        continue;
      }
    } catch (error) {
      lastError = error;
    }
    await wait(650 * attempt);
  }

  throw new Error(`Не удалось загрузить ${url}: ${lastError?.message ?? "unknown error"}`);
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function decodeFormula(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function renderFormula(sourceFormula, displayMode = false) {
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
  return (rawHtml ?? "")
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula) => renderFormula(formula, false))
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => renderFormula(formula, true))
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula) => renderFormula(formula, true))
    .replace(/<img\b(?![^>]*\bloading=)([^>]*)>/gi, '<img loading="lazy" decoding="async"$1>')
    .replace(/<table\b([^>]*)>/gi, '<div class="exam-table-scroll"><table$1>')
    .replace(/<\/table>/gi, "</table></div>");
}

async function discoverCatalog() {
  const homeHtml = await (await fetchWithRetry(`${SITE_ROOT}/archive`)).text();
  const appPath = homeHtml.match(/src="(\/js\/app\.[^"]+\.js)"/)?.[1];
  if (!appPath) throw new Error("Не найден основной JavaScript КЕГЭ");

  const appSource = await (await fetchWithRetry(new URL(appPath, SITE_ROOT))).text();
  const archiveHash = appSource.match(/704:"([^"]+)"/)?.[1];
  if (!archiveHash) throw new Error("Не найден модуль архива КЕГЭ");

  const archiveSource = await (
    await fetchWithRetry(`${SITE_ROOT}/js/704.${archiveHash}.js`)
  ).text();
  const matches = archiveSource.matchAll(
    /<a href="\/variant\?kim=(\d+)"[^>]*>([^<]+)<\/a>/g,
  );
  const catalog = [];
  const seen = new Set();

  for (const match of matches) {
    const kim = match[1];
    if (seen.has(kim)) continue;
    seen.add(kim);
    catalog.push({
      kim,
      title: match[2]
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim(),
    });
  }

  return catalog;
}

async function importVariant(entry, index, total) {
  const outputUrl = new URL(`${entry.kim}.json`, outputRoot);
  try {
    const existing = JSON.parse(await readFile(outputUrl, "utf8"));
    return {
      kim: entry.kim,
      title: entry.title || existing.title,
      taskCount: existing.tasks?.length ?? 0,
      sourceUrl: existing.sourceUrl ?? `${SITE_ROOT}/variant?kim=${entry.kim}`,
    };
  } catch {
    // Missing or invalid cache entries are imported below.
  }

  await wait(110);
  const response = await fetchWithRetry(`${API_ROOT}/variant/kim/${entry.kim}`);
  if (!response.ok) {
    console.warn(`Пропущен КИМ ${entry.kim}: ${response.status}`);
    return {
      kim: entry.kim,
      title: entry.title,
      taskCount: 0,
      sourceUrl: `${SITE_ROOT}/variant?kim=${entry.kim}`,
    };
  }
  const source = await response.json();
  const payload = {
    kim: String(source.kim),
    title: entry.title || source.description || `КИМ № ${source.kim}`,
    sourceUrl: `${SITE_ROOT}/variant?kim=${source.kim}`,
    tasks: (source.tasks ?? []).map((task) => ({
      id: String(task.taskId),
      number: Number(task.number),
      html: prepareTaskHtml(task.text),
      answer: String(task.answer ?? ""),
      table: {
        cols: Math.max(1, Number(task.table?.cols ?? 1)),
        rows: Math.max(1, Number(task.table?.rows ?? 1)),
      },
      files: (task.files ?? []).map((file) => ({
        name: file.name,
        href: new URL(file.url, SITE_ROOT).href,
        sourceUrl: new URL(file.url, SITE_ROOT).href,
      })),
    })),
  };

  await writeFile(
    outputUrl,
    `${JSON.stringify(payload)}\n`,
  );

  if ((index + 1) % 20 === 0 || index + 1 === total) {
    console.log(`Варианты: ${index + 1}/${total}`);
  }

  return {
    kim: entry.kim,
    title: payload.title,
    taskCount: payload.tasks.length,
    sourceUrl: payload.sourceUrl,
  };
}

export async function importKompegeVariants() {
  await mkdir(outputRoot, { recursive: true });
  const catalog = await discoverCatalog();
  const imported = await mapLimit(catalog, concurrency, (entry, index) =>
    importVariant(entry, index, catalog.length),
  );
  const valid = imported.filter((entry) => entry.taskCount > 0);

  await writeFile(
    manifestUrl,
    `${JSON.stringify({
      source: `${SITE_ROOT}/archive`,
      importedAt: new Date().toISOString(),
      total: valid.length,
      variants: valid,
    }, null, 2)}\n`,
  );

  return valid;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const variants = await importKompegeVariants();
  console.log(`Готово: ${variants.length} вариантов`);
}
