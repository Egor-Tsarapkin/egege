import { env } from "cloudflare:workers";
import taskIndex from "@/public/data/task-index.json";
import { authenticatedUser, communityDb } from "@/lib/community-server";
import { cleanText, ensureTeacherSchema, formatBytes, isTeacherTaskId } from "@/lib/teacher-studio-server";

type RouteContext = { params: Promise<{ kim: string }> };
type VariantRow = {
  id: number;
  kim: string;
  title: string;
  description_html: string;
  no_time: number;
  hide_answers: number;
  require_auth: number;
  one_attempt: number;
};
type PublicTask = {
  id: string;
  number: number;
  html: string;
  table: { cols: number; rows: number };
  files: Array<{ name: string; href: string }>;
  answer?: string;
  solution?: { html: string; videoUrl: string; timecode: number };
};

function expandTeacherTask(task: PublicTask, answerValues: string[]) {
  if (task.number !== 19) return [task];
  return [19, 20, 21].map((number, index) => ({
    ...task,
    id: `${task.id}-${number}`,
    number,
    answer: answerValues[index] ?? "",
    table: { cols: 1, rows: 1 },
  }));
}

async function variantRow(kim: string) {
  await ensureTeacherSchema();
  return communityDb().prepare("SELECT * FROM teacher_variants WHERE kim = ?")
    .bind(kim).first<VariantRow>();
}

async function loadTeacherTasks(ids: string[]) {
  if (!ids.length) return new Map<string, PublicTask>();
  const rows = await communityDb().prepare(`SELECT * FROM teacher_tasks WHERE public_id IN (${ids.map(() => "?").join(",")})`)
    .bind(...ids).all<Record<string, unknown>>();
  const taskIds = rows.results.map((row) => Number(row.id));
  const files = taskIds.length
    ? await communityDb().prepare(`SELECT id, task_id, name, size FROM teacher_task_files
        WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY created_at`).bind(...taskIds).all<{
          id: number; task_id: number; name: string; size: number;
        }>()
    : { results: [] as Array<{ id: number; task_id: number; name: string; size: number }> };
  const fileMap = new Map<number, typeof files.results>();
  for (const file of files.results) fileMap.set(file.task_id, [...(fileMap.get(file.task_id) ?? []), file]);
  return new Map(rows.results.map((row) => {
    const answer = JSON.parse(String(row.answer_json || "{}")) as { cols?: number; rows?: number; values?: string[] };
    const task = {
      id: String(row.public_id),
      number: Number(row.exam_number),
      html: String(row.statement_html),
      table: { cols: answer.cols ?? 1, rows: answer.rows ?? 1 },
      files: (fileMap.get(Number(row.id)) ?? []).map((file) => ({
        name: file.name,
        href: `/api/teacher-files?id=${file.id}&size=${encodeURIComponent(formatBytes(file.size))}`,
      })),
      answer: (answer.values ?? []).join(" "),
      solution: {
        html: String(row.solution_html || ""),
        videoUrl: String(row.solution_video_url || ""),
        timecode: Number(row.solution_timecode || 0),
      },
    } satisfies PublicTask;
    return [String(row.public_id), expandTeacherTask(task, answer.values ?? [])];
  }));
}

async function loadImportedTasks(request: Request, ids: string[]) {
  const index = taskIndex as Record<string, number>;
  const numbers = [...new Set(ids.map((id) => index[id]).filter(Boolean))];
  const groups = await Promise.all(numbers.map(async (number) => {
    const assetUrl = new URL(`/data/tasks/${number}.json`, request.url);
    const response = env.ASSETS
      ? await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }))
      : await fetch(assetUrl);
    if (!response.ok) return [] as PublicTask[];
    return response.json() as Promise<PublicTask[]>;
  }));
  const wanted = new Set(ids);
  return new Map(groups.flat().filter((task) => wanted.has(String(task.id))).map((task) => [String(task.id), task]));
}

export async function GET(request: Request, context: RouteContext) {
  const { kim } = await context.params;
  const variant = await variantRow(kim);
  if (!variant) return Response.json({ error: "Вариант не найден" }, { status: 404 });
  const user = await authenticatedUser(request);
  if ((variant.require_auth || variant.one_attempt) && !user) {
    return Response.json({ error: "Для этого варианта нужно войти в аккаунт", code: "AUTH_REQUIRED" }, { status: 401 });
  }
  if (variant.one_attempt && user) {
    const used = await communityDb().prepare(
      "SELECT id FROM teacher_variant_attempts WHERE variant_id = ? AND user_id = ? LIMIT 1",
    ).bind(variant.id, user.id).first();
    if (used) return Response.json({ error: "Единственная попытка уже использована", code: "ONE_ATTEMPT_USED" }, { status: 409 });
  }
  const items = await communityDb().prepare(
    "SELECT position, task_public_id FROM teacher_variant_tasks WHERE variant_id = ? ORDER BY position",
  ).bind(variant.id).all<{ position: number; task_public_id: string }>();
  const ids = items.results.map((item) => item.task_public_id);
  const [teacherTasks, importedTasks] = await Promise.all([
    loadTeacherTasks([...new Set(ids.filter(isTeacherTaskId))]),
    loadImportedTasks(request, [...new Set(ids.filter((id) => !isTeacherTaskId(id)))]),
  ]);
  const missing = ids.find((id) => isTeacherTaskId(id) ? !teacherTasks.has(id) : !importedTasks.has(id));
  if (missing) {
    return Response.json({ error: `Задание ${missing} не найдено. Удалите его из варианта.` }, { status: 409 });
  }
  const tasks = items.results.flatMap((item) => {
    const teacherTask = teacherTasks.get(item.task_public_id);
    const importedTask = importedTasks.get(item.task_public_id);
    const loaded = teacherTask ?? (importedTask ? [importedTask] : undefined);
    return loaded ?? [];
  });
  const numberedTasks = tasks.map((task, index) => ({ ...task, slot: index + 1 }));
  return Response.json({
    kim: variant.kim,
    title: variant.title,
    sourceUrl: "",
    sourceLabel: "Авторский вариант EGEGE",
    descriptionHtml: variant.description_html,
    noTime: Boolean(variant.no_time),
    hideAnswers: Boolean(variant.hide_answers),
    oneAttempt: Boolean(variant.one_attempt),
    custom: true,
    tasks: numberedTasks,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { kim } = await context.params;
  const variant = await variantRow(kim);
  if (!variant) return Response.json({ error: "Вариант не найден" }, { status: 404 });
  const user = await authenticatedUser(request);
  if ((variant.require_auth || variant.one_attempt) && !user) {
    return Response.json({ error: "Нужно войти в аккаунт" }, { status: 401 });
  }
  if (variant.one_attempt && user) {
    const used = await communityDb().prepare(
      "SELECT id FROM teacher_variant_attempts WHERE variant_id = ? AND user_id = ? LIMIT 1",
    ).bind(variant.id, user.id).first();
    if (used) return Response.json({ error: "Единственная попытка уже использована" }, { status: 409 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.completedAt !== "string") return Response.json({ error: "Некорректный результат" }, { status: 400 });
  const anonymousId = cleanText(body.anonymousId, 80) || crypto.randomUUID();
  const userId = user?.id ?? `guest:${anonymousId}`;
  const studentName = cleanText(
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? body.studentName ?? "Гость",
    80,
  ) || "Гость";
  const results = Array.isArray(body.results) ? body.results.slice(0, 60).map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      slot: Math.max(1, Math.floor(Number(row.slot) || 1)),
      taskId: cleanText(row.taskId, 32),
      taskNumber: Math.max(1, Math.min(27, Math.floor(Number(row.taskNumber) || 1))),
      answered: Boolean(row.answered),
      correct: Boolean(row.correct),
      points: Math.max(0, Math.min(2, Math.floor(Number(row.points) || 0))),
    };
  }) : [];
  const completedAt = new Date(body.completedAt).toISOString();
  const id = `${variant.id}:${userId}:${completedAt}`;
  await communityDb().prepare(`INSERT INTO teacher_variant_attempts
    (id, variant_id, user_id, student_name, score, correct_count, answered_count,
     duration_seconds, completed_at, results_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id, variant.id, userId, studentName,
      Math.max(0, Math.min(100, Math.floor(Number(body.testScore) || 0))),
      Math.max(0, Math.floor(Number(body.correctCount) || 0)),
      Math.max(0, Math.floor(Number(body.answeredCount) || 0)),
      Math.max(0, Math.floor(Number(body.durationSeconds) || 0)),
      completedAt, JSON.stringify(results), Math.floor(Date.now() / 1000),
    ).run();
  return Response.json({ ok: true });
}
