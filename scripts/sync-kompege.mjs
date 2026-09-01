import { mkdir, open, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { importKompegeTasks } from "./import-kompege-tasks.mjs";
import { importKompegeVariants } from "./import-kompege-variants.mjs";

const lockDirectory = new URL("../.cache/", import.meta.url);
const lockFile = new URL("kompege-sync.lock", lockDirectory);

function runScript(path) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${path}: код ${code}`)));
  });
}

await mkdir(lockDirectory, { recursive: true });
let lock;
try {
  lock = await open(lockFile, "wx");
} catch (error) {
  if (error?.code === "EEXIST") {
    console.log("Синхронизация КЕГЭ уже выполняется, повторный запуск пропущен.");
    process.exit(0);
  }
  throw error;
}

try {
  await lock.writeFile(`${process.pid}\n${new Date().toISOString()}\n`);
  const tasks = await importKompegeTasks();
  process.env.REFRESH_CURRENT_YEAR = "1";
  const variants = await importKompegeVariants();
  await runScript(new URL("./sync-variant-tasks.mjs", import.meta.url));
  console.log(`КЕГЭ обновлён: ${tasks.total} заданий, ${variants.length} вариантов.`);
} finally {
  await lock.close();
  await rm(lockFile, { force: true });
}
