import { readFile } from "node:fs/promises";
import path from "node:path";
import taskIndex from "@/public/data/task-index.json";

type Task = { id: string; number: number; note?: string; html: string; answer?: string };

function plainText(html: string) {
  return html.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—").replace(/&laquo;/gi, "«").replace(/&raquo;/gi, "»").replace(/&amp;/gi, "&").replace(/&#39;/g, "'").replace(/&quot;/gi, '"').replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").trim();
}

function imageSources(html: string) {
  return Array.from(html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1])
    .filter((src) => src.startsWith("/materials/") || /^https:\/\/(?:www\.)?kompege\.ru\/images\//i.test(src))
    .slice(0, 8);
}

function boardTask(task: Task) {
  const html = task.html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "").replace(/javascript\s*:/gi, "");
  return { id: task.id, number: task.number, note: task.note ?? "", text: plainText(task.html), html, images: imageSources(task.html), answer: String(task.answer ?? "").slice(0, 20_000) };
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!/^\d{4,20}$/.test(id)) return Response.json({ error: "Введите ID задания" }, { status: 400 });
  if (id.startsWith("0")) {
    const response = await fetch(new URL(`/api/teacher-tasks?id=${encodeURIComponent(id)}`, request.url), { headers: { cookie: request.headers.get("cookie") ?? "" } });
    const body = await response.json() as { tasks?: Task[] }; const task = body.tasks?.[0];
    if (!task) return Response.json({ error: "Задание не найдено" }, { status: 404 });
    return Response.json({ task: boardTask(task) });
  }
  const number = (taskIndex as Record<string, number>)[id];
  if (!number) return Response.json({ error: "Задание не найдено" }, { status: 404 });
  const source = await readFile(path.join(process.cwd(), "public", "data", "tasks", `${number}.json`), "utf8");
  const task = (JSON.parse(source) as Task[]).find((item) => item.id === id);
  if (!task) return Response.json({ error: "Задание не найдено" }, { status: 404 });
  return Response.json({ task: boardTask(task) });
}
