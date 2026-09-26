import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import katex from "katex";

const API_ROOT = "https://kompege.ru/api/v1";
const SITE_ROOT = "https://kompege.ru";
const outputRoot = new URL("../public/data/", import.meta.url);
const taskOutputRoot = new URL("../public/data/tasks/", import.meta.url);
const imageOutputRoot = new URL("../public/materials/kege/imported/", import.meta.url);
const fileOutputRoot = new URL("../public/materials/kege/files/", import.meta.url);
const archiveNumbers = [103, 106, 109, 110, 112, 113, 117, 122, 127];
const sourceNumbers = [...Array.from({ length: 19 }, (_, index) => index + 1), 22, 23, 24, 25, 26, 27, ...archiveNumbers];
const outputNumbers = [...Array.from({ length: 27 }, (_, index) => index + 1), ...archiveNumbers];
const taskTitles = {
  1: "Анализ информационных моделей",
  2: "Таблицы истинности логических выражений",
  3: "Поиск и сортировка в базах данных",
  4: "Кодирование и декодирование данных. Условие Фано",
  5: "Анализ алгоритмов для исполнителей",
  6: "Циклические алгоритмы для Исполнителя",
  7: "Кодирование графической и звуковой информации",
  8: "Комбинаторика",
  9: "Обработка числовой информации в электронных таблицах",
  10: "IP адреса и сети",
  11: "Вычисление количества информации",
  12: "Машина Тьюринга",
  13: "Динамическое программирование (количество программ)",
  14: "Позиционные системы счисления",
  15: "Истинность логического выражения",
  16: "Вычисление значения рекурсивной функции",
  17: "Обработка целочисленных данных. Проверка делимости",
  18: "Динамическое программирование в электронных таблицах",
  19: "Теория игр",
  22: "Многопоточные вычисления",
  23: "Алгоритмы обхода графа",
  24: "Обработка символьных строк",
  25: "Обработка целочисленных данных. Поиск делителей",
  26: "Обработка данных с помощью сортировки",
  27: "Анализ данных",
  103: "Поиск и сортировка в базах данных (Архив)",
  106: "Анализ программ с циклами (Архив)",
  109: "Обработка числовой информации в электронных таблицах (Архив)",
  110: "Поиск слова в текстовом документе",
  112: "Алгоритмы для исполнителей с циклами и ветвлениями",
  113: "Количество путей в ориентированном графе (Архив)",
  117: "Обработка целочисленных данных. Проверка делимости (Архив)",
  122: "Анализ программ с циклами и ветвлениями (Архив)",
  127: "Обработка потока данных (Архив)",
};
const difficultyNames = ["Базовый", "Средний", "Высокий", "Высокий"];
const concurrency = 2;
const downloadFiles = process.env.DOWNLOAD_TASK_FILES === "1";

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url, options = {}, attempts = 8) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "*/*",
          "User-Agent": "EGEGE educational importer (permission granted by source owner)",
          ...options.headers,
        },
      });

      if (response.ok) return response;
      lastError = new Error(`${response.status} ${response.statusText}`);
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await wait(Math.max(retryAfter * 1000, 2500 * attempt));
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

function safeFilePart(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}

function extensionForMime(mime) {
  if (mime === "jpeg") return "jpg";
  if (mime === "svg+xml") return "svg";
  return mime;
}

async function extractInlineImages(html, taskId) {
  let imageIndex = 0;
  const pending = [];

  const nextHtml = html.replace(
    /(<img\b[^>]*?\bsrc=["'])data:image\/([a-zA-Z0-9+.-]+);base64,([^"']+)(["'][^>]*>)/gi,
    (_match, prefix, mime, encoded, suffix) => {
      imageIndex += 1;
      const extension = extensionForMime(mime.toLowerCase());
      const fileName = `${taskId}-${imageIndex}.${extension}`;
      pending.push(
        writeFile(new URL(fileName, imageOutputRoot), Buffer.from(encoded.replace(/\s/g, ""), "base64")),
      );
      return `${prefix}/materials/kege/imported/${fileName}${suffix}`;
    },
  );

  await Promise.all(pending);
  return nextHtml;
}

function prepareMarkup(html) {
  return html
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula) => renderFormula(formula, false))
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => renderFormula(formula, true))
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula) => renderFormula(formula, true))
    .replace(/<img\b(?![^>]*\bloading=)([^>]*)>/gi, '<img loading="lazy" decoding="async"$1>')
    .replace(/<table\b([^>]*)>/gi, '<div class="task-table-scroll"><table$1>')
    .replace(/<\/table>/gi, "</table></div>");
}

function publicDownloadName(number, index, count, sourceName, remoteUrl) {
  const extension = extname(sourceName || remoteUrl.pathname) || extname(remoteUrl.pathname);
  if (count === 1) return `${number}${extension}`;
  if (index < 26) return `${number}_${String.fromCharCode(65 + index)}${extension}`;
  return `${number}_${index + 1}${extension}`;
}

async function downloadTaskFiles(files, taskId, number) {
  return mapLimit(files ?? [], 1, async (file, index) => {
    const remoteUrl = new URL(file.url, SITE_ROOT);
    const originalName = safeFilePart(file.name || basename(remoteUrl.pathname)) || `file-${index + 1}`;
    const remoteExtension = extname(remoteUrl.pathname);
    const nameWithExtension = extname(originalName)
      ? originalName
      : `${originalName}${remoteExtension}`;
    const localName = `${taskId}-${index + 1}-${nameWithExtension}`;
    const localUrl = new URL(localName, fileOutputRoot);
    const publicHref = `/materials/kege/files/${localName}`;
    let exists = false;
    try {
      exists = (await stat(localUrl)).size > 0;
    } catch {
      exists = false;
    }

    if (!exists && downloadFiles) {
      await wait(90);
      const response = await fetchWithRetry(remoteUrl);
      await writeFile(localUrl, Buffer.from(await response.arrayBuffer()));
      exists = true;
    }

    const downloadName = publicDownloadName(number, index, files.length, file.name, remoteUrl);

    return {
      name: downloadName,
      href: downloadFiles && exists
        ? publicHref
        : `/api/task-file?source=${encodeURIComponent(remoteUrl.href)}&name=${encodeURIComponent(downloadName)}&taskId=${encodeURIComponent(taskId)}&fileIndex=${index}`,
      sourceUrl: remoteUrl.href,
      meta: "Файл к заданию",
    };
  });
}

async function makeTask(source, number, id, text, answer, table = source.table, parentId) {
  const htmlWithImages = await extractInlineImages(text ?? "", id);
  return {
    id: String(id),
    ...(parentId ? { parentId: String(parentId) } : {}),
    number,
    difficulty: difficultyNames[Number(source.difficulty)] ?? "Средний",
    source: "КЕГЭ",
    title: taskTitles[number] ?? `Задание №${number}`,
    note: source.comment || undefined,
    html: prepareMarkup(htmlWithImages),
    answer: String(answer ?? ""),
    table: {
      cols: Math.max(1, Number(table?.cols ?? 1)),
      rows: Math.max(1, Number(table?.rows ?? 1)),
    },
    files: await downloadTaskFiles(source.files, id, number),
  };
}

async function importNumber(number) {
  const response = await fetchWithRetry(`${API_ROOT}/task/number/${number}`, {
    headers: { Accept: "application/json" },
  });
  const sourceTasks = await response.json();
  const result = [];

  for (const source of sourceTasks) {
    result.push(
      await makeTask(source, number, source.taskId, source.text, source.key, source.table),
    );

    if (number === 19) {
      for (const subTask of source.subTask ?? []) {
        const subNumber = Number(subTask.number);
        const subId = `${source.taskId}${subNumber}`;
        result.push(
          await makeTask(
            { ...source, files: [] },
            subNumber,
            subId,
            `${source.text ?? ""}${subTask.text ?? ""}`,
            subTask.key,
            subTask.table,
            source.taskId,
          ),
        );
      }
    }
  }

  console.log(`№${number}: ${sourceTasks.length}`);
  return result;
}

export async function importKompegeTasks() {
  await Promise.all([
    mkdir(taskOutputRoot, { recursive: true }),
    mkdir(imageOutputRoot, { recursive: true }),
    mkdir(fileOutputRoot, { recursive: true }),
  ]);

  const importedGroups = await mapLimit(sourceNumbers, concurrency, importNumber);
  const tasks = importedGroups.flat().sort((left, right) => {
    if (left.number !== right.number) return left.number - right.number;
    return Number(right.id) - Number(left.id);
  });

  await Promise.all(
    outputNumbers.map(async (number) => {
      const tasksForNumber = tasks.filter((task) => task.number === number);
      await writeFile(
        new URL(`${number}.json`, taskOutputRoot),
        `${JSON.stringify(tasksForNumber)}\n`,
      );
    }),
  );

  // Synthetic game-part IDs must not overwrite real KEGE IDs (311 + 20 vs 31120).
  const taskIndex = Object.fromEntries([...tasks.filter((task) => task.parentId), ...tasks.filter((task) => !task.parentId)].map((task) => [task.id, task.number]));
  const taskCounts = Object.fromEntries(
    outputNumbers.map((number) => {
      return [number, tasks.filter((task) => task.number === number).length];
    }),
  );

  await Promise.all([
    writeFile(new URL("task-index.json", outputRoot), `${JSON.stringify(taskIndex)}\n`),
    writeFile(
      new URL("task-manifest.json", outputRoot),
      `${JSON.stringify({
        source: "https://kompege.ru/task",
        importedAt: new Date().toISOString(),
        total: tasks.length,
        counts: taskCounts,
      }, null, 2)}\n`,
    ),
  ]);

  return { total: tasks.length, counts: taskCounts };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await importKompegeTasks();
  console.log(`Готово: ${result.total} заданий`);
  console.log(result.counts);
}
