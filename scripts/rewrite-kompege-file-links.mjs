import { readdir, readFile, writeFile } from "node:fs/promises";

const roots = [
  new URL("../public/data/tasks/", import.meta.url),
  new URL("../public/data/variants/", import.meta.url),
];

function proxyHref(source, name) {
  return `/api/task-file?source=${encodeURIComponent(source)}&name=${encodeURIComponent(name || "material")}`;
}

function rewriteFiles(node) {
  let changed = 0;
  if (!node || typeof node !== "object") return changed;

  if (Array.isArray(node.files)) {
    for (const file of node.files) {
      const source =
        file.sourceUrl ||
        (typeof file.href === "string" && file.href.startsWith("https://kompege.ru/files/")
          ? file.href
          : "");
      if (!source) continue;
      const nextHref = proxyHref(source, file.name);
      if (file.href !== nextHref || file.sourceUrl !== source) {
        file.href = nextHref;
        file.sourceUrl = source;
        changed += 1;
      }
    }
  }

  if (Array.isArray(node)) {
    for (const child of node) changed += rewriteFiles(child);
  } else {
    for (const value of Object.values(node)) changed += rewriteFiles(value);
  }

  return changed;
}

let changedFiles = 0;
let changedLinks = 0;

for (const root of roots) {
  for (const name of await readdir(root)) {
    if (!name.endsWith(".json")) continue;
    const url = new URL(name, root);
    const payload = JSON.parse(await readFile(url, "utf8"));
    const count = rewriteFiles(payload);
    if (!count) continue;
    await writeFile(url, `${JSON.stringify(payload)}\n`);
    changedFiles += 1;
    changedLinks += count;
  }
}

console.log(`Обновлено ${changedLinks} ссылок в ${changedFiles} файлах`);
