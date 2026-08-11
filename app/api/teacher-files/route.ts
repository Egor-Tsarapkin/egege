import { env } from "cloudflare:workers";
import { authenticatedUser, communityDb } from "@/lib/community-server";
import { cleanText, ensureTeacherSchema } from "@/lib/teacher-studio-server";

function downloadName(value: string) {
  return value.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "file";
}

export async function GET(request: Request) {
  await ensureTeacherSchema();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1 || !env.FILES) {
    return Response.json({ error: "Файл не найден" }, { status: 404 });
  }
  const row = await communityDb().prepare(
    "SELECT storage_key, name, content_type FROM teacher_task_files WHERE id = ?",
  ).bind(id).first<{ storage_key: string; name: string; content_type: string }>();
  if (!row) return Response.json({ error: "Файл не найден" }, { status: 404 });
  const object = await env.FILES.get(row.storage_key);
  if (!object) return Response.json({ error: "Файл не найден" }, { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", row.content_type || "application/octet-stream");
  headers.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(downloadName(row.name))}`);
  headers.set("cache-control", "public, max-age=3600");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  await ensureTeacherSchema();
  if (!env.FILES) return Response.json({ error: "Хранилище файлов недоступно" }, { status: 503 });
  const form = await request.formData();
  const publicId = cleanText(form.get("taskId"), 32);
  const task = await communityDb().prepare(
    "SELECT id FROM teacher_tasks WHERE public_id = ? AND owner_id = ?",
  ).bind(publicId, user.id).first<{ id: number }>();
  if (!task) return Response.json({ error: "Сначала сохраните задание" }, { status: 404 });
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  if (!files.length) return Response.json({ error: "Выберите файлы" }, { status: 400 });
  if (files.length > 10) return Response.json({ error: "За один раз можно загрузить до 10 файлов" }, { status: 400 });
  const oversized = files.find((file) => file.size > 25 * 1024 * 1024);
  if (oversized) return Response.json({ error: `${oversized.name}: размер больше 25 МБ` }, { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  for (const file of files) {
    const name = downloadName(file.name);
    const key = `teacher-tasks/${user.id}/${publicId}/${crypto.randomUUID()}-${name}`;
    await env.FILES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { ownerId: user.id, taskId: publicId, originalName: name },
    });
    await communityDb().prepare(`INSERT INTO teacher_task_files
      (task_id, owner_id, storage_key, name, content_type, size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(task.id, user.id, key, name, file.type || "application/octet-stream", file.size, now).run();
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  await ensureTeacherSchema();
  const id = Number(new URL(request.url).searchParams.get("id"));
  const file = await communityDb().prepare(
    "SELECT storage_key FROM teacher_task_files WHERE id = ? AND owner_id = ?",
  ).bind(id, user.id).first<{ storage_key: string }>();
  if (!file) return Response.json({ error: "Файл не найден" }, { status: 404 });
  if (env.FILES) await env.FILES.delete(file.storage_key);
  await communityDb().prepare("DELETE FROM teacher_task_files WHERE id = ? AND owner_id = ?")
    .bind(id, user.id).run();
  return Response.json({ ok: true });
}
