import { communityDb } from "@/lib/community-server";
import { ensureTeacherSchema, formatBytes } from "@/lib/teacher-studio-server";

type TaskRow = {
  id: number;
  public_id: string;
  exam_number: number;
  note: string;
  statement_html: string;
  answer_json: string;
  solution_video_url: string;
  solution_timecode: number;
  solution_html: string;
  display_name: string | null;
};

export async function GET(request: Request) {
  await ensureTeacherSchema();
  const url = new URL(request.url);
  const number = Number(url.searchParams.get("number"));
  const id = String(url.searchParams.get("id") ?? "").trim();
  if ((!Number.isInteger(number) || number < 1 || number > 27) && !/^0\d{5,}$/.test(id)) {
    return Response.json({ tasks: [] });
  }
  const rows = id
    ? await communityDb().prepare(`SELECT t.*, p.display_name FROM teacher_tasks t
        LEFT JOIN profiles p ON p.user_id = t.owner_id WHERE t.public_id = ? LIMIT 1`).bind(id).all<TaskRow>()
    : await communityDb().prepare(`SELECT t.*, p.display_name FROM teacher_tasks t
        LEFT JOIN profiles p ON p.user_id = t.owner_id WHERE t.exam_number = ?
        ORDER BY t.created_at DESC LIMIT 300`).bind(number).all<TaskRow>();
  const taskIds = rows.results.map((row) => row.id);
  const files = taskIds.length
    ? await communityDb().prepare(`SELECT id, task_id, name, size FROM teacher_task_files
        WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY created_at`).bind(...taskIds).all<{
          id: number; task_id: number; name: string; size: number;
        }>()
    : { results: [] as Array<{ id: number; task_id: number; name: string; size: number }> };
  const fileMap = new Map<number, typeof files.results>();
  for (const file of files.results) fileMap.set(file.task_id, [...(fileMap.get(file.task_id) ?? []), file]);
  return Response.json({
    tasks: rows.results.map((row) => {
      const answer = JSON.parse(row.answer_json) as { cols?: number; rows?: number; values?: string[] };
      return {
        id: row.public_id,
        number: row.exam_number,
        difficulty: "Средний",
        source: "EGEGE",
        title: `Задание №${row.exam_number}`,
        note: row.note || `Автор: ${row.display_name || "пользователь EGEGE"}`,
        html: row.statement_html,
        answer: (answer.values ?? []).join(" "),
        table: { cols: answer.cols ?? 1, rows: answer.rows ?? 1 },
        solution: {
          html: row.solution_html,
          videoUrl: row.solution_video_url,
          timecode: row.solution_timecode,
        },
        files: (fileMap.get(row.id) ?? []).map((file) => ({
          name: file.name,
          href: `/api/teacher-files?id=${file.id}`,
          meta: formatBytes(file.size),
        })),
      };
    }),
  });
}
