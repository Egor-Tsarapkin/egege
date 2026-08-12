import sanitizeHtml from "sanitize-html";
import { communityDb } from "@/lib/community-server";

let teacherSchemaReady: Promise<void> | null = null;

async function ensureColumn(table: string, column: string, definition: string) {
  const columns = await communityDb().prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!columns.results.some((item) => item.name === column)) {
    await communityDb().prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

export function ensureTeacherSchema() {
  if (teacherSchemaReady) return teacherSchemaReady;
  const db = communityDb();
  teacherSchemaReady = db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id TEXT NOT NULL,
      parent_id INTEGER,
      kind TEXT NOT NULL CHECK(kind IN ('tasks', 'variants')),
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      folder_id INTEGER,
      exam_number INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      statement_html TEXT NOT NULL,
      answer_type TEXT NOT NULL DEFAULT 'field' CHECK(answer_type IN ('field', 'table')),
      answer_json TEXT NOT NULL,
      solution_video_url TEXT NOT NULL DEFAULT '',
      solution_timecode INTEGER NOT NULL DEFAULT 0,
      solution_html TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL DEFAULT 'Средний',
      approved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_task_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      owner_id TEXT NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kim TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      folder_id INTEGER,
      title TEXT NOT NULL,
      description_html TEXT NOT NULL DEFAULT '',
      no_time INTEGER NOT NULL DEFAULT 0,
      hide_answers INTEGER NOT NULL DEFAULT 0,
      require_auth INTEGER NOT NULL DEFAULT 0,
      one_attempt INTEGER NOT NULL DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_variant_tasks (
      variant_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      task_public_id TEXT NOT NULL,
      PRIMARY KEY (variant_id, position)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS teacher_variant_attempts (
      id TEXT PRIMARY KEY,
      variant_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      answered_count INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      results_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS teacher_folders_owner_kind_parent_idx ON teacher_folders(owner_id, kind, parent_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS teacher_tasks_owner_folder_idx ON teacher_tasks(owner_id, folder_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS teacher_tasks_exam_number_idx ON teacher_tasks(exam_number, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS teacher_task_files_task_idx ON teacher_task_files(task_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS teacher_variants_owner_folder_idx ON teacher_variants(owner_id, folder_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS teacher_variant_tasks_task_idx ON teacher_variant_tasks(task_public_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS teacher_variant_attempts_variant_created_idx ON teacher_variant_attempts(variant_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS teacher_variant_attempts_variant_user_idx ON teacher_variant_attempts(variant_id, user_id)"),
  ]).then(async () => {
    await ensureColumn("teacher_tasks", "difficulty", "TEXT NOT NULL DEFAULT 'Средний'");
    await ensureColumn("teacher_tasks", "approved", "INTEGER NOT NULL DEFAULT 0");
    await ensureColumn("teacher_variants", "approved", "INTEGER NOT NULL DEFAULT 0");
  }).catch((error: unknown) => {
    teacherSchemaReady = null;
    throw error;
  });
  return teacherSchemaReady;
}

export const richHtmlOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "sub", "sup", "code", "pre",
    "h2", "h3", "blockquote", "ol", "ul", "li", "a", "img", "table", "thead", "tbody",
    "tr", "th", "td", "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading", "decoding"],
    table: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    span: ["class", "data-formula"],
    div: ["class"],
    code: ["class"],
    pre: ["class"],
  },
  allowedClasses: {
    span: ["teacher-formula"],
    div: ["teacher-formula-block"],
    table: ["teacher-content-table"],
    code: ["language-*"],
    pre: ["language-*"],
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noreferrer noopener" }),
    img: sanitizeHtml.simpleTransform("img", { loading: "lazy", decoding: "async" }),
  },
};

export function cleanRichHtml(value: unknown, maxLength = 350_000) {
  const html = typeof value === "string" ? value.slice(0, maxLength) : "";
  return sanitizeHtml(html, richHtmlOptions).trim();
}

export function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength) : "";
}

export function parseAnswer(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const type = source.type === "table" ? "table" : "field";
  const cols = Math.max(1, Math.min(10, Math.floor(Number(source.cols) || 1)));
  const rows = Math.max(1, Math.min(10, Math.floor(Number(source.rows) || 1)));
  const values = Array.isArray(source.values)
    ? source.values.slice(0, cols * rows).map((item) => cleanText(item, 200))
    : [cleanText(source.value, 200)];
  while (values.length < cols * rows) values.push("");
  return { type, cols: type === "table" ? cols : 1, rows: type === "table" ? rows : 1, values };
}

export function parseTimecode(value: unknown) {
  if (typeof value === "number") return Math.max(0, Math.min(86_400, Math.floor(value)));
  const text = cleanText(value, 16);
  if (!text) return 0;
  const parts = text.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;
  if (parts.length === 3) return Math.min(86_400, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 2) return Math.min(86_400, parts[0] * 60 + parts[1]);
  return Math.min(86_400, Math.floor(parts[0] || 0));
}

export function publicTaskId(rowId: number) {
  return `0${String(rowId).padStart(5, "0")}`;
}

export function publicVariantKim(rowId: number) {
  return `0${String(rowId).padStart(7, "0")}`;
}

export function isTeacherTaskId(value: string) {
  return /^0\d{5,}$/.test(value);
}

export function isTeacherKim(value: string) {
  return /^0\d{7}$/.test(value);
}

export function taskExamNumbers(examNumber: number) {
  return examNumber === 19 ? [19, 20, 21] : [examNumber];
}

export function safeFolderId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}
