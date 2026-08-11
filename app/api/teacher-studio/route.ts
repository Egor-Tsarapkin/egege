import { env } from "cloudflare:workers";
import taskIndex from "@/public/data/task-index.json";
import { authenticatedUser, communityDb } from "@/lib/community-server";
import {
  cleanRichHtml,
  cleanText,
  ensureTeacherSchema,
  isTeacherTaskId,
  parseAnswer,
  parseTimecode,
  publicTaskId,
  publicVariantKim,
  safeFolderId,
} from "@/lib/teacher-studio-server";

type D1Row = Record<string, unknown>;

async function requireTeacher(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return { error: Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 }) };
  await ensureTeacherSchema();
  return { user };
}

async function ownedFolder(ownerId: string, id: number | null, kind: "tasks" | "variants") {
  if (!id) return true;
  return Boolean(await communityDb().prepare(
    "SELECT id FROM teacher_folders WHERE id = ? AND owner_id = ? AND kind = ?",
  ).bind(id, ownerId, kind).first());
}

async function ownedTask(ownerId: string, publicId: string) {
  return communityDb().prepare(
    "SELECT * FROM teacher_tasks WHERE public_id = ? AND owner_id = ?",
  ).bind(publicId, ownerId).first<D1Row>();
}

async function ownedVariant(ownerId: string, kim: string) {
  return communityDb().prepare(
    "SELECT * FROM teacher_variants WHERE kim = ? AND owner_id = ?",
  ).bind(kim, ownerId).first<D1Row>();
}

function normalizeTaskIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item, 32)).filter(Boolean).slice(0, 60);
}

async function validateTaskIds(ids: string[]) {
  if (!ids.length) return "Добавьте хотя бы одно задание";
  const uniqueAuthored = [...new Set(ids.filter(isTeacherTaskId))];
  if (uniqueAuthored.length) {
    const placeholders = uniqueAuthored.map(() => "?").join(",");
    const found = await communityDb().prepare(
      `SELECT public_id FROM teacher_tasks WHERE public_id IN (${placeholders})`,
    ).bind(...uniqueAuthored).all<{ public_id: string }>();
    const present = new Set(found.results.map((row) => row.public_id));
    const missing = uniqueAuthored.find((id) => !present.has(id));
    if (missing) return `Задание ${missing} не найдено`;
  }
  const missingImported = ids.find((id) => !isTeacherTaskId(id) && !(id in taskIndex));
  return missingImported ? `Задание ${missingImported} не найдено` : "";
}

async function studioPayload(ownerId: string) {
  const db = communityDb();
  const [folders, tasks, files, variants, variantTasks] = await Promise.all([
    db.prepare("SELECT * FROM teacher_folders WHERE owner_id = ? ORDER BY name COLLATE NOCASE").bind(ownerId).all<D1Row>(),
    db.prepare("SELECT * FROM teacher_tasks WHERE owner_id = ? ORDER BY updated_at DESC").bind(ownerId).all<D1Row>(),
    db.prepare("SELECT * FROM teacher_task_files WHERE owner_id = ? ORDER BY created_at").bind(ownerId).all<D1Row>(),
    db.prepare(`SELECT v.*, COUNT(a.id) AS attempts_count
      FROM teacher_variants v LEFT JOIN teacher_variant_attempts a ON a.variant_id = v.id
      WHERE v.owner_id = ? GROUP BY v.id ORDER BY v.updated_at DESC`).bind(ownerId).all<D1Row>(),
    db.prepare(`SELECT vt.variant_id, vt.position, vt.task_public_id
      FROM teacher_variant_tasks vt JOIN teacher_variants v ON v.id = vt.variant_id
      WHERE v.owner_id = ? ORDER BY vt.variant_id, vt.position`).bind(ownerId).all<D1Row>(),
  ]);

  const fileMap = new Map<number, D1Row[]>();
  for (const file of files.results) {
    const taskId = Number(file.task_id);
    fileMap.set(taskId, [...(fileMap.get(taskId) ?? []), file]);
  }
  const itemMap = new Map<number, string[]>();
  for (const item of variantTasks.results) {
    const variantId = Number(item.variant_id);
    itemMap.set(variantId, [...(itemMap.get(variantId) ?? []), String(item.task_public_id)]);
  }

  return {
    folders: folders.results,
    tasks: tasks.results.map((task) => ({
      ...task,
      answer: JSON.parse(String(task.answer_json || "{}")),
      files: fileMap.get(Number(task.id)) ?? [],
    })),
    variants: variants.results.map((variant) => ({
      ...variant,
      task_ids: itemMap.get(Number(variant.id)) ?? [],
    })),
  };
}

export async function GET(request: Request) {
  const auth = await requireTeacher(request);
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const statsKim = cleanText(url.searchParams.get("stats"), 16);
  if (!statsKim) return Response.json(await studioPayload(auth.user.id));

  const variant = await ownedVariant(auth.user.id, statsKim);
  if (!variant) return Response.json({ error: "Вариант не найден" }, { status: 404 });
  const attempts = await communityDb().prepare(
    `SELECT id, student_name, score, correct_count, answered_count, duration_seconds,
            completed_at, results_json
     FROM teacher_variant_attempts WHERE variant_id = ? ORDER BY created_at DESC`,
  ).bind(variant.id).all<D1Row>();
  return Response.json({
    kim: statsKim,
    title: variant.title,
    attempts: attempts.results.map((attempt) => ({
      ...attempt,
      results: JSON.parse(String(attempt.results_json || "[]")),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireTeacher(request);
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Не удалось прочитать данные" }, { status: 400 });
  const action = cleanText(body.action, 40);
  const db = communityDb();
  const now = Math.floor(Date.now() / 1000);

  if (action === "create_folder") {
    const kind = body.kind === "tasks" ? "tasks" : "variants";
    const name = cleanText(body.name, 64);
    const parentId = safeFolderId(body.parentId);
    if (!name) return Response.json({ error: "Введите название папки" }, { status: 400 });
    if (!(await ownedFolder(auth.user.id, parentId, kind))) {
      return Response.json({ error: "Родительская папка не найдена" }, { status: 400 });
    }
    await db.prepare(`INSERT INTO teacher_folders (owner_id, parent_id, kind, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`).bind(auth.user.id, parentId, kind, name, now, now).run();
    return Response.json(await studioPayload(auth.user.id));
  }

  if (action === "rename_folder") {
    const id = safeFolderId(body.id);
    const name = cleanText(body.name, 64);
    if (!id || !name) return Response.json({ error: "Некорректная папка" }, { status: 400 });
    const result = await db.prepare("UPDATE teacher_folders SET name = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
      .bind(name, now, id, auth.user.id).run();
    if (!result.meta.changes) return Response.json({ error: "Папка не найдена" }, { status: 404 });
    return Response.json(await studioPayload(auth.user.id));
  }

  if (action === "delete_folder") {
    const id = safeFolderId(body.id);
    if (!id) return Response.json({ error: "Папка не найдена" }, { status: 404 });
    const folder = await db.prepare("SELECT kind, parent_id FROM teacher_folders WHERE id = ? AND owner_id = ?")
      .bind(id, auth.user.id).first<{ kind: "tasks" | "variants"; parent_id: number | null }>();
    if (!folder) return Response.json({ error: "Папка не найдена" }, { status: 404 });
    await db.batch([
      db.prepare("UPDATE teacher_folders SET parent_id = ? WHERE parent_id = ? AND owner_id = ?").bind(folder.parent_id, id, auth.user.id),
      folder.kind === "tasks"
        ? db.prepare("UPDATE teacher_tasks SET folder_id = ?, updated_at = ? WHERE folder_id = ? AND owner_id = ?").bind(folder.parent_id, now, id, auth.user.id)
        : db.prepare("UPDATE teacher_variants SET folder_id = ?, updated_at = ? WHERE folder_id = ? AND owner_id = ?").bind(folder.parent_id, now, id, auth.user.id),
      db.prepare("DELETE FROM teacher_folders WHERE id = ? AND owner_id = ?").bind(id, auth.user.id),
    ]);
    return Response.json(await studioPayload(auth.user.id));
  }

  if (action === "create_task" || action === "update_task") {
    const examNumber = Math.max(1, Math.min(27, Math.floor(Number(body.examNumber) || 1)));
    const folderId = safeFolderId(body.folderId);
    const note = cleanText(body.note, 160);
    const statementHtml = cleanRichHtml(body.statementHtml);
    const solutionHtml = cleanRichHtml(body.solutionHtml);
    const answer = parseAnswer(body.answer);
    const videoUrl = cleanText(body.solutionVideoUrl, 500);
    const timecode = parseTimecode(body.solutionTimecode);
    if (!statementHtml) return Response.json({ error: "Добавьте условие задания" }, { status: 400 });
    if (!answer.values.some(Boolean)) return Response.json({ error: "Укажите правильный ответ" }, { status: 400 });
    if (!(await ownedFolder(auth.user.id, folderId, "tasks"))) {
      return Response.json({ error: "Папка не найдена" }, { status: 400 });
    }

    if (action === "create_task") {
      const insert = await db.prepare(`INSERT INTO teacher_tasks
        (public_id, owner_id, folder_id, exam_number, note, statement_html, answer_type,
         answer_json, solution_video_url, solution_timecode, solution_html, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(`pending:${crypto.randomUUID()}`, auth.user.id, folderId, examNumber, note, statementHtml, answer.type, JSON.stringify(answer), videoUrl, timecode, solutionHtml, now, now).run();
      const id = Number(insert.meta.last_row_id);
      const publicId = publicTaskId(id);
      await db.prepare("UPDATE teacher_tasks SET public_id = ? WHERE id = ?").bind(publicId, id).run();
      return Response.json({ ...(await studioPayload(auth.user.id)), savedId: publicId });
    }

    const publicId = cleanText(body.publicId, 32);
    const result = await db.prepare(`UPDATE teacher_tasks SET folder_id = ?, exam_number = ?, note = ?,
      statement_html = ?, answer_type = ?, answer_json = ?, solution_video_url = ?,
      solution_timecode = ?, solution_html = ?, updated_at = ?
      WHERE public_id = ? AND owner_id = ?`)
      .bind(folderId, examNumber, note, statementHtml, answer.type, JSON.stringify(answer), videoUrl, timecode, solutionHtml, now, publicId, auth.user.id).run();
    if (!result.meta.changes) return Response.json({ error: "Задание не найдено" }, { status: 404 });
    return Response.json({ ...(await studioPayload(auth.user.id)), savedId: publicId });
  }

  if (action === "move_task") {
    const publicId = cleanText(body.publicId, 32);
    const folderId = safeFolderId(body.folderId);
    if (!(await ownedFolder(auth.user.id, folderId, "tasks"))) return Response.json({ error: "Папка не найдена" }, { status: 400 });
    await db.prepare("UPDATE teacher_tasks SET folder_id = ?, updated_at = ? WHERE public_id = ? AND owner_id = ?")
      .bind(folderId, now, publicId, auth.user.id).run();
    return Response.json(await studioPayload(auth.user.id));
  }

  if (action === "delete_task") {
    const publicId = cleanText(body.publicId, 32);
    const task = await ownedTask(auth.user.id, publicId);
    if (!task) return Response.json({ error: "Задание не найдено" }, { status: 404 });
    const files = await db.prepare("SELECT storage_key FROM teacher_task_files WHERE task_id = ? AND owner_id = ?")
      .bind(task.id, auth.user.id).all<{ storage_key: string }>();
    const bucket = env.FILES;
    if (bucket && files.results.length) await Promise.all(files.results.map((file) => bucket.delete(file.storage_key)));
    await db.batch([
      db.prepare("DELETE FROM teacher_task_files WHERE task_id = ? AND owner_id = ?").bind(task.id, auth.user.id),
      db.prepare("DELETE FROM teacher_variant_tasks WHERE task_public_id = ?").bind(publicId),
      db.prepare("DELETE FROM teacher_tasks WHERE id = ? AND owner_id = ?").bind(task.id, auth.user.id),
    ]);
    return Response.json(await studioPayload(auth.user.id));
  }

  if (action === "create_variant" || action === "update_variant") {
    const folderId = safeFolderId(body.folderId);
    const title = cleanText(body.title, 120);
    const descriptionHtml = cleanRichHtml(body.descriptionHtml);
    const taskIds = normalizeTaskIds(body.taskIds);
    const validationError = await validateTaskIds(taskIds);
    if (!title) return Response.json({ error: "Введите название варианта" }, { status: 400 });
    if (validationError) return Response.json({ error: validationError }, { status: 400 });
    if (!(await ownedFolder(auth.user.id, folderId, "variants"))) {
      return Response.json({ error: "Папка не найдена" }, { status: 400 });
    }
    const oneAttempt = Boolean(body.oneAttempt);
    const values = {
      noTime: Number(Boolean(body.noTime)),
      hideAnswers: Number(Boolean(body.hideAnswers)),
      requireAuth: Number(Boolean(body.requireAuth) || oneAttempt),
      oneAttempt: Number(oneAttempt),
    };
    let variantId: number;
    let kim: string;
    if (action === "create_variant") {
      const insert = await db.prepare(`INSERT INTO teacher_variants
        (kim, owner_id, folder_id, title, description_html, no_time, hide_answers,
         require_auth, one_attempt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(`pending:${crypto.randomUUID()}`, auth.user.id, folderId, title, descriptionHtml, values.noTime, values.hideAnswers, values.requireAuth, values.oneAttempt, now, now).run();
      variantId = Number(insert.meta.last_row_id);
      kim = publicVariantKim(variantId);
      await db.prepare("UPDATE teacher_variants SET kim = ? WHERE id = ?").bind(kim, variantId).run();
    } else {
      kim = cleanText(body.kim, 16);
      const variant = await ownedVariant(auth.user.id, kim);
      if (!variant) return Response.json({ error: "Вариант не найден" }, { status: 404 });
      variantId = Number(variant.id);
      await db.prepare(`UPDATE teacher_variants SET folder_id = ?, title = ?, description_html = ?,
        no_time = ?, hide_answers = ?, require_auth = ?, one_attempt = ?, updated_at = ?
        WHERE id = ? AND owner_id = ?`)
        .bind(folderId, title, descriptionHtml, values.noTime, values.hideAnswers, values.requireAuth, values.oneAttempt, now, variantId, auth.user.id).run();
    }
    await db.batch([
      db.prepare("DELETE FROM teacher_variant_tasks WHERE variant_id = ?").bind(variantId),
      ...taskIds.map((taskId, position) => db.prepare(
        "INSERT INTO teacher_variant_tasks (variant_id, position, task_public_id) VALUES (?, ?, ?)",
      ).bind(variantId, position + 1, taskId)),
    ]);
    return Response.json({ ...(await studioPayload(auth.user.id)), savedKim: kim });
  }

  if (action === "move_variant") {
    const kim = cleanText(body.kim, 16);
    const folderId = safeFolderId(body.folderId);
    if (!(await ownedFolder(auth.user.id, folderId, "variants"))) return Response.json({ error: "Папка не найдена" }, { status: 400 });
    await db.prepare("UPDATE teacher_variants SET folder_id = ?, updated_at = ? WHERE kim = ? AND owner_id = ?")
      .bind(folderId, now, kim, auth.user.id).run();
    return Response.json(await studioPayload(auth.user.id));
  }

  if (action === "delete_variant") {
    const kim = cleanText(body.kim, 16);
    const variant = await ownedVariant(auth.user.id, kim);
    if (!variant) return Response.json({ error: "Вариант не найден" }, { status: 404 });
    await db.batch([
      db.prepare("DELETE FROM teacher_variant_tasks WHERE variant_id = ?").bind(variant.id),
      db.prepare("DELETE FROM teacher_variant_attempts WHERE variant_id = ?").bind(variant.id),
      db.prepare("DELETE FROM teacher_variants WHERE id = ? AND owner_id = ?").bind(variant.id, auth.user.id),
    ]);
    return Response.json(await studioPayload(auth.user.id));
  }

  return Response.json({ error: "Неизвестное действие" }, { status: 400 });
}
