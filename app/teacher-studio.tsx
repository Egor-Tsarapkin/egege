"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  BarChart3,
  Bold,
  Check,
  ChevronRight,
  Copy,
  FilePlus2,
  Folder,
  FolderPlus,
  GripVertical,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Sigma,
  Subscript,
  Superscript,
  Table2,
  Trash2,
  Underline,
  UploadCloud,
  X,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import RichHtml from "@/app/rich-html";

type StudioSection = "variants" | "tasks";
type FolderRow = { id: number; owner_id: string; parent_id: number | null; kind: StudioSection; name: string };
type Answer = { type: "field" | "table"; cols: number; rows: number; values: string[] };
type TaskFile = { id: number; name: string; size: number };
type TaskRow = {
  id: number;
  public_id: string;
  folder_id: number | null;
  exam_number: number;
  note: string;
  statement_html: string;
  answer_type: "field" | "table";
  answer: Answer;
  solution_video_url: string;
  solution_timecode: number;
  solution_html: string;
  updated_at: number;
  files: TaskFile[];
};
type VariantRow = {
  id: number;
  kim: string;
  folder_id: number | null;
  title: string;
  description_html: string;
  no_time: number;
  hide_answers: number;
  require_auth: number;
  one_attempt: number;
  attempts_count: number;
  task_ids: string[];
  updated_at: number;
};
type StudioPayload = { folders: FolderRow[]; tasks: TaskRow[]; variants: VariantRow[]; savedId?: string; savedKim?: string };
type AttemptResult = { slot: number; taskId: string; taskNumber: number; answered: boolean; correct: boolean; points: number };
type AttemptRow = {
  id: string;
  student_name: string;
  score: number;
  correct_count: number;
  answered_count: number;
  duration_seconds: number;
  completed_at: string;
  results: AttemptResult[];
};
type StatsPayload = { kim: string; title: string; attempts: AttemptRow[] };
type PreviewTask = { id: string; number: number; html: string; answer?: string; table?: { cols: number; rows: number } };

let taskIndexRequest: Promise<Record<string, number>> | null = null;

function getTaskIndex() {
  taskIndexRequest ??= fetch("/data/task-index.json").then((response) => {
    if (!response.ok) throw new Error("Не удалось проверить базу заданий");
    return response.json() as Promise<Record<string, number>>;
  });
  return taskIndexRequest;
}

async function loadTaskPreviews(ids: string[]) {
  const unique = [...new Set(ids)];
  const result = new Map<string, PreviewTask>();
  const authored = unique.filter((id) => /^0\d{5,}$/.test(id));
  const imported = unique.filter((id) => !/^0\d{5,}$/.test(id));
  await Promise.all(authored.map(async (id) => {
    const response = await fetch(`/api/teacher-tasks?id=${encodeURIComponent(id)}`);
    const payload = response.ok ? await response.json() as { tasks?: PreviewTask[] } : {};
    const task = payload.tasks?.find((item) => String(item.id) === id);
    if (task) result.set(id, task);
  }));
  if (imported.length) {
    const index = await getTaskIndex();
    const numbers = [...new Set(imported.map((id) => index[id]).filter(Boolean))];
    const groups = await Promise.all(numbers.map(async (number) => {
      const response = await fetch(`/data/tasks/${number}.json`);
      return response.ok ? response.json() as Promise<PreviewTask[]> : [];
    }));
    const wanted = new Set(imported);
    groups.flat().forEach((task) => {
      const id = String(task.id);
      if (wanted.has(id)) result.set(id, task);
    });
  }
  return result;
}

async function uploadEmbeddedImages(html: string) {
  if (!html.includes("src=\"data:image/")) return html;
  const documentHtml = new DOMParser().parseFromString(`<div id="teacher-html-root">${html}</div>`, "text/html");
  const root = documentHtml.querySelector("#teacher-html-root");
  if (!root) return html;
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img[src^="data:image/"]'));
  await Promise.all(images.map(async (image, index) => {
    const blob = await fetch(image.src).then((response) => response.blob());
    const form = new FormData();
    form.set("image", new File([blob], `image-${index + 1}.${blob.type.includes("jpeg") ? "jpg" : "png"}`, { type: blob.type || "image/png" }));
    const uploaded = await studioRequest<{ url: string }>("/api/teacher-images", { method: "POST", body: form });
    image.src = uploaded.url;
  }));
  return root.innerHTML;
}

async function studioRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const client = await getSupabaseBrowserClient();
  const { data } = client ? await client.auth.getSession() : { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) throw new Error("Нужно войти в аккаунт");
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
      authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Не удалось выполнить действие");
  return payload;
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatTimecode(seconds: number) {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : `${minutes}:${String(rest).padStart(2, "0")}`;
}

function folderOptions(folders: FolderRow[], kind: StudioSection) {
  const byParent = new Map<number | null, FolderRow[]>();
  folders.filter((folder) => folder.kind === kind).forEach((folder) => {
    byParent.set(folder.parent_id, [...(byParent.get(folder.parent_id) ?? []), folder]);
  });
  const result: Array<{ id: number; label: string }> = [];
  const walk = (parent: number | null, prefix: string) => {
    (byParent.get(parent) ?? []).forEach((folder) => {
      result.push({ id: folder.id, label: `${prefix}${folder.name}` });
      walk(folder.id, `${prefix}   `);
    });
  };
  walk(null, "");
  return result;
}

function insertHtml(html: string) {
  document.execCommand("insertHTML", false, html);
}

function RichEditor({ value, onChange, label, minHeight = 190 }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  minHeight?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageBusy, setImageBusy] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && document.activeElement !== editor && editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  const command = (name: string, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, argument);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const addLink = () => {
    const url = window.prompt("Вставьте ссылку");
    if (url) command("createLink", url);
  };
  const addTable = () => {
    const cols = Math.max(1, Math.min(8, Number(window.prompt("Количество столбцов", "3")) || 0));
    const rows = Math.max(1, Math.min(20, Number(window.prompt("Количество строк", "3")) || 0));
    if (!cols || !rows) return;
    insertHtml(`<table class="teacher-content-table"><tbody>${Array.from({ length: rows }, () => `<tr>${Array.from({ length: cols }, () => "<td><br></td>").join("")}</tr>`).join("")}</tbody></table><p><br></p>`);
    onChange(editorRef.current?.innerHTML ?? "");
  };
  const addFormula = () => {
    const formula = window.prompt("Введите формулу в LaTeX", "x^2 + y^2 = z^2")?.trim();
    if (!formula) return;
    const escaped = formula.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    insertHtml(`<span class="teacher-formula" data-formula="${escaped}">${escaped}</span>&nbsp;`);
    onChange(editorRef.current?.innerHTML ?? "");
  };
  const addImage = async (file?: File) => {
    if (!file) return;
    setImageBusy(true);
    try {
      const form = new FormData();
      form.set("image", file, file.name || "image.png");
      const uploaded = await studioRequest<{ url: string }>("/api/teacher-images", { method: "POST", body: form });
      editorRef.current?.focus();
      insertHtml(`<img src="${uploaded.url}" alt="Изображение к заданию"><p><br></p>`);
      onChange(editorRef.current?.innerHTML ?? "");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Не удалось загрузить изображение");
    } finally {
      setImageBusy(false);
    }
  };

  const pasteContent = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
    if (!image) {
      window.setTimeout(() => onChange(editorRef.current?.innerHTML ?? ""));
      return;
    }
    event.preventDefault();
    void addImage(image);
  };

  return (
    <div className="teacher-rich-editor">
      <div className="teacher-editor-label">{label}</div>
      <div className="teacher-editor-toolbar" role="toolbar" aria-label={`Форматирование: ${label}`}>
        <select aria-label="Стиль текста" onChange={(event) => command("formatBlock", event.target.value)} defaultValue="p">
          <option value="p">Обычный текст</option>
          <option value="h2">Заголовок</option>
          <option value="h3">Подзаголовок</option>
          <option value="pre">Код</option>
          <option value="blockquote">Цитата</option>
        </select>
        <button type="button" onClick={() => command("bold")} aria-label="Полужирный"><Bold /></button>
        <button type="button" onClick={() => command("italic")} aria-label="Курсив"><Italic /></button>
        <button type="button" onClick={() => command("underline")} aria-label="Подчёркивание"><Underline /></button>
        <button type="button" onClick={() => command("superscript")} aria-label="Верхний индекс"><Superscript /></button>
        <button type="button" onClick={() => command("subscript")} aria-label="Нижний индекс"><Subscript /></button>
        <span />
        <button type="button" onClick={() => command("insertUnorderedList")} aria-label="Маркированный список"><List /></button>
        <button type="button" onClick={() => command("insertOrderedList")} aria-label="Нумерованный список"><ListOrdered /></button>
        <button type="button" onClick={addLink} aria-label="Ссылка"><LinkIcon /></button>
        <button type="button" onClick={addTable} aria-label="Таблица"><Table2 /></button>
        <button type="button" onClick={addFormula} aria-label="Формула"><Sigma /></button>
        <button type="button" onClick={() => imageInput.current?.click()} aria-label="Изображение" disabled={imageBusy}><ImageIcon /></button>
        <button type="button" onClick={() => command("removeFormat")} aria-label="Очистить форматирование"><AlignLeft /></button>
        <input ref={imageInput} type="file" accept="image/*" hidden onChange={(event) => void addImage(event.target.files?.[0])} />
      </div>
      <div
        ref={editorRef}
        className="teacher-editor-canvas"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Начните писать или вставьте готовый текст..."
        style={{ minHeight }}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        onPaste={pasteContent}
      />
      {imageBusy && <span className="teacher-image-progress">Загружаем изображение…</span>}
    </div>
  );
}

function Switch({ checked, onChange, label, note }: { checked: boolean; onChange: (checked: boolean) => void; label: string; note: string }) {
  return (
    <label className="teacher-switch-row">
      <button type="button" className={checked ? "is-on" : ""} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}><i /></button>
      <span><strong>{label}</strong><small>{note}</small></span>
    </label>
  );
}

function FolderSelect({ value, onChange, folders, kind }: { value: number | null; onChange: (value: number | null) => void; folders: FolderRow[]; kind: StudioSection }) {
  return (
    <label className="teacher-field">
      <span>Папка</span>
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}>
        <option value="">Без папки</option>
        {folderOptions(folders, kind).map((folder) => <option value={folder.id} key={folder.id}>{folder.label}</option>)}
      </select>
    </label>
  );
}

const emptyAnswer: Answer = { type: "field", cols: 1, rows: 1, values: [""] };

function TaskEditor({ task, folders, initialFolder, onClose, onSaved }: {
  task: TaskRow | null;
  folders: FolderRow[];
  initialFolder: number | null;
  onClose: () => void;
  onSaved: (payload: StudioPayload, message: string) => void;
}) {
  const [folderId, setFolderId] = useState(task?.folder_id ?? initialFolder);
  const [examNumber, setExamNumber] = useState(task?.exam_number ?? 1);
  const [note, setNote] = useState(task?.note ?? "");
  const [statementHtml, setStatementHtml] = useState(task?.statement_html ?? "");
  const [answer, setAnswer] = useState<Answer>(task?.answer ?? emptyAnswer);
  const [solutionHtml, setSolutionHtml] = useState(task?.solution_html ?? "");
  const [videoUrl, setVideoUrl] = useState(task?.solution_video_url ?? "");
  const [timecode, setTimecode] = useState(formatTimecode(task?.solution_timecode ?? 0));
  const [activeTab, setActiveTab] = useState<"task" | "solution">("task");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const resizeTable = (cols: number, rows: number) => {
    const next = Array.from({ length: cols * rows }, (_, index) => answer.values[index] ?? "");
    setAnswer({ type: "table", cols, rows, values: next });
  };
  const collectFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    setPendingFiles((current) => [...current, ...incoming].slice(0, 10));
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const [storedStatementHtml, storedSolutionHtml] = await Promise.all([
        uploadEmbeddedImages(statementHtml),
        uploadEmbeddedImages(solutionHtml),
      ]);
      setStatementHtml(storedStatementHtml);
      setSolutionHtml(storedSolutionHtml);
      let payload = await studioRequest<StudioPayload>("/api/teacher-studio", {
        method: "POST",
        body: JSON.stringify({
          action: task ? "update_task" : "create_task",
          publicId: task?.public_id,
          folderId,
          examNumber,
          note,
          statementHtml: storedStatementHtml,
          answer,
          solutionVideoUrl: videoUrl,
          solutionTimecode: timecode,
          solutionHtml: storedSolutionHtml,
        }),
      });
      const savedId = payload.savedId ?? task?.public_id;
      if (savedId && pendingFiles.length) {
        const form = new FormData();
        form.set("taskId", savedId);
        pendingFiles.forEach((file) => form.append("files", file));
        await studioRequest("/api/teacher-files", { method: "POST", body: form });
        payload = await studioRequest<StudioPayload>("/api/teacher-studio");
      }
      onSaved(payload, task ? `Задание ${savedId} обновлено` : `Задание ${savedId} создано`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить задание");
    } finally {
      setBusy(false);
    }
  };
  const removeFile = async (fileId: number) => {
    if (!window.confirm("Удалить этот файл?")) return;
    setBusy(true);
    try {
      await studioRequest(`/api/teacher-files?id=${fileId}`, { method: "DELETE" });
      const payload = await studioRequest<StudioPayload>("/api/teacher-studio");
      onSaved(payload, "Файл удалён");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Не удалось удалить файл");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="teacher-editor-page">
      <header className="teacher-editor-header">
        <button type="button" onClick={onClose}><X /> Закрыть</button>
        <div><p>{task ? `ID ${task.public_id}` : "Новое задание"}</p><h2>{task ? "Редактирование задания" : "Создание задания"}</h2></div>
        <button type="button" className="teacher-primary" onClick={() => void save()} disabled={busy}>{busy ? "Сохраняем..." : "Сохранить"}</button>
      </header>

      <div className="teacher-editor-tabs" role="tablist">
        <button className={activeTab === "task" ? "is-active" : ""} onClick={() => setActiveTab("task")}>Условие и ответ</button>
        <button className={activeTab === "solution" ? "is-active" : ""} onClick={() => setActiveTab("solution")}>Разбор</button>
      </div>

      {activeTab === "task" ? (
        <div className="teacher-form-stack">
          <div className="teacher-form-grid">
            <label className="teacher-field"><span>Номер ЕГЭ</span><select value={examNumber} onChange={(event) => setExamNumber(Number(event.target.value))}>{Array.from({ length: 27 }, (_, index) => <option value={index + 1} key={index + 1}>Задание №{index + 1}</option>)}</select></label>
            <FolderSelect value={folderId} onChange={setFolderId} folders={folders} kind="tasks" />
            <label className="teacher-field teacher-field-wide"><span>Примечание</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Например: домашняя работа по графам" maxLength={160} /></label>
          </div>
          <RichEditor value={statementHtml} onChange={setStatementHtml} label="Условие задания" minHeight={260} />
          <section className="teacher-live-preview">
            <div><p>Предпросмотр</p><h3>Так задание увидит ученик</h3></div>
            <article><span>Задание №{examNumber}</span>{statementHtml ? <RichHtml html={statementHtml} /> : <p>Условие пока не добавлено</p>}</article>
          </section>
          <section className="teacher-answer-builder">
            <div><p>Правильный ответ</p><h3>Как ученик будет отвечать</h3></div>
            <div className="teacher-answer-type">
              <button type="button" className={answer.type === "field" ? "is-active" : ""} onClick={() => setAnswer({ ...emptyAnswer })}>Одно поле</button>
              <button type="button" className={answer.type === "table" ? "is-active" : ""} onClick={() => resizeTable(2, 2)}>Таблица</button>
            </div>
            {answer.type === "field" ? (
              <label className="teacher-field"><span>Ответ без пояснений</span><input value={answer.values[0] ?? ""} onChange={(event) => setAnswer({ ...answer, values: [event.target.value] })} /></label>
            ) : (
              <div className="teacher-table-answer-builder">
                <div className="teacher-table-size"><label>Столбцов <input type="number" min={1} max={10} value={answer.cols} onChange={(event) => resizeTable(Math.max(1, Math.min(10, Number(event.target.value))), answer.rows)} /></label><label>Строк <input type="number" min={1} max={10} value={answer.rows} onChange={(event) => resizeTable(answer.cols, Math.max(1, Math.min(10, Number(event.target.value))))} /></label></div>
                <div className="teacher-answer-cells" style={{ gridTemplateColumns: `repeat(${answer.cols}, minmax(72px, 1fr))` }}>{answer.values.map((value, index) => <input aria-label={`Ячейка ответа ${index + 1}`} value={value} onChange={(event) => setAnswer((current) => ({ ...current, values: current.values.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} key={index} />)}</div>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="teacher-form-stack">
          <section className="teacher-video-fields">
            <div><p>Видеоразбор</p><h3>Ссылка сразу откроется на нужном месте</h3></div>
            <label className="teacher-field teacher-field-wide"><span>Ссылка на YouTube</span><input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtu.be/..." /></label>
            <label className="teacher-field"><span>Таймкод</span><input value={timecode} onChange={(event) => setTimecode(event.target.value)} placeholder="2:08" inputMode="numeric" /></label>
          </section>
          <RichEditor value={solutionHtml} onChange={setSolutionHtml} label="Текстовый разбор" minHeight={260} />
        </div>
      )}

      <section className="teacher-files-section">
        <div><p>Файлы к заданию</p><h3>Добавить исходные данные или материалы</h3></div>
        <div
          className={`teacher-dropzone ${draggingFiles ? "is-dragging" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDraggingFiles(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setDraggingFiles(false); }}
          onDrop={(event) => { event.preventDefault(); setDraggingFiles(false); collectFiles(event.dataTransfer.files); }}
        >
          <UploadCloud />
          <strong>Перетащите файлы сюда</strong>
          <span>или выберите их на компьютере, до 25 МБ каждый</span>
          <label>Выбрать файлы<input type="file" multiple hidden onChange={(event) => event.target.files && collectFiles(event.target.files)} /></label>
        </div>
        {(task?.files.length || pendingFiles.length) ? <div className="teacher-file-list">
          {task?.files.map((file) => <article key={`saved-${file.id}`}><FilePlus2 /><span><strong>{file.name}</strong><small>Уже загружен</small></span><button type="button" onClick={() => void removeFile(file.id)} aria-label={`Удалить ${file.name}`}><Trash2 /></button></article>)}
          {pendingFiles.map((file, index) => <article key={`${file.name}-${index}`}><FilePlus2 /><span><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} КБ, загрузится после сохранения</small></span><button type="button" onClick={() => setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Убрать ${file.name}`}><X /></button></article>)}
        </div> : null}
      </section>
      {error && <p className="teacher-form-error" role="alert">{error}</p>}
      <div className="teacher-editor-bottom"><button type="button" onClick={onClose}>Отмена</button><button type="button" className="teacher-primary" onClick={() => void save()} disabled={busy}>{busy ? "Сохраняем..." : "Сохранить задание"}</button></div>
    </section>
  );
}

function VariantEditor({ variant, folders, initialFolder, onClose, onSaved }: {
  variant: VariantRow | null;
  folders: FolderRow[];
  initialFolder: number | null;
  onClose: () => void;
  onSaved: (payload: StudioPayload, message: string) => void;
}) {
  const [title, setTitle] = useState(variant?.title ?? "");
  const [descriptionHtml, setDescriptionHtml] = useState(variant?.description_html ?? "");
  const [folderId, setFolderId] = useState(variant?.folder_id ?? initialFolder);
  const [noTime, setNoTime] = useState(Boolean(variant?.no_time));
  const [hideAnswers, setHideAnswers] = useState(Boolean(variant?.hide_answers));
  const [requireAuth, setRequireAuth] = useState(Boolean(variant?.require_auth));
  const [oneAttempt, setOneAttempt] = useState(Boolean(variant?.one_attempt));
  const [taskIds, setTaskIds] = useState(variant?.task_ids ?? []);
  const [taskInput, setTaskInput] = useState("");
  const [taskPreviews, setTaskPreviews] = useState<Map<string, PreviewTask>>(new Map());
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkingTasks, setCheckingTasks] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!taskIds.length) return;
    let active = true;
    void loadTaskPreviews(taskIds).then((previews) => {
      if (active) setTaskPreviews(previews);
    }).catch(() => undefined);
    return () => { active = false; };
    // Existing tasks are loaded once when the editor opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTasks = async () => {
    const ids = taskInput.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
    if (!ids.length) return;
    setCheckingTasks(true);
    setError("");
    try {
      const previews = await loadTaskPreviews(ids);
      const missing = ids.find((id) => !previews.has(id));
      if (missing) throw new Error(`Задание ${missing} не найдено`);
      setTaskPreviews((current) => new Map([...current, ...previews]));
      setTaskIds((current) => [...current, ...ids].slice(0, 60));
      setTaskInput("");
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Не удалось проверить ID");
    } finally {
      setCheckingTasks(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = await studioRequest<StudioPayload>("/api/teacher-studio", {
        method: "POST",
        body: JSON.stringify({
          action: variant ? "update_variant" : "create_variant",
          kim: variant?.kim,
          title,
          descriptionHtml,
          folderId,
          noTime,
          hideAnswers,
          requireAuth,
          oneAttempt,
          taskIds,
        }),
      });
      const kim = payload.savedKim ?? variant?.kim;
      onSaved(payload, variant ? `Вариант ${kim} обновлён` : `Вариант ${kim} создан`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить вариант");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="teacher-editor-page teacher-variant-editor">
      <header className="teacher-editor-header">
        <button type="button" onClick={onClose}><X /> Закрыть</button>
        <div><p>{variant ? `КИМ ${variant.kim}` : "Новый вариант"}</p><h2>{variant ? "Редактирование варианта" : "Соберите вариант по ID"}</h2></div>
        <button type="button" className="teacher-primary" onClick={() => void save()} disabled={busy}>{busy ? "Сохраняем..." : "Сохранить"}</button>
      </header>
      <div className="teacher-form-stack">
        <div className="teacher-form-grid">
          <label className="teacher-field teacher-field-wide"><span>Название варианта</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например: Повторение перед пробником" maxLength={120} /></label>
          <FolderSelect value={folderId} onChange={setFolderId} folders={folders} kind="variants" />
        </div>
        <RichEditor value={descriptionHtml} onChange={setDescriptionHtml} label="Описание перед началом" minHeight={180} />
        <p className="teacher-helper">Ученик увидит это сообщение перед справочными материалами и первым заданием.</p>
        <section className="teacher-variant-options">
          <Switch checked={noTime} onChange={setNoTime} label="Без ограничения времени" note="Таймер не показывается и не завершает работу автоматически" />
          <Switch checked={hideAnswers} onChange={setHideAnswers} label="Скрывать правильные ответы" note="После сдачи видны только задания, решённые верно" />
          <Switch checked={requireAuth} onChange={setRequireAuth} label="Обязательная авторизация" note="Без входа в аккаунт начать вариант нельзя" />
          <Switch checked={oneAttempt} onChange={(checked) => { setOneAttempt(checked); if (checked) setRequireAuth(true); }} label="Одна попытка" note="После первой сдачи повторный запуск будет закрыт" />
        </section>
        <section className="teacher-task-sequence">
          <div className="teacher-sequence-heading"><div><p>Задания варианта</p><h3>{taskIds.length ? `${taskIds.length} заданий` : "Добавьте задания по ID"}</h3></div><span>Порядок можно менять перетаскиванием</span></div>
          <div className="teacher-add-id"><label><span>ID одного или нескольких заданий</span><input value={taskInput} onChange={(event) => setTaskInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addTasks(); } }} placeholder="31529, 031529" /></label><button type="button" onClick={() => void addTasks()} disabled={checkingTasks}><Plus /> {checkingTasks ? "Проверяем…" : "Добавить"}</button></div>
          {taskIds.length ? <div className="teacher-sequence-list">{taskIds.map((id, index) => (
            <article
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null || dragIndex === index) return;
                setTaskIds((current) => {
                  const next = [...current];
                  const [moved] = next.splice(dragIndex, 1);
                  next.splice(index, 0, moved);
                  return next;
                });
                setDragIndex(null);
              }}
              key={`${id}-${index}`}
            ><div className="teacher-sequence-summary"><GripVertical /><b>{index + 1}</b><span>ID {id}</span><button type="button" onClick={() => setTaskIds((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Удалить задание ${id}`}><X /></button></div>{taskPreviews.get(id) ? <div className="teacher-sequence-preview"><RichHtml html={taskPreviews.get(id)?.html ?? ""} /></div> : <div className="teacher-sequence-preview is-loading">Загружаем предпросмотр…</div>}</article>
          ))}</div> : <div className="teacher-inline-empty">Можно смешивать любые номера и повторять типы заданий.</div>}
        </section>
      </div>
      {error && <p className="teacher-form-error" role="alert">{error}</p>}
      <div className="teacher-editor-bottom"><button type="button" onClick={onClose}>Отмена</button><button type="button" className="teacher-primary" onClick={() => void save()} disabled={busy}>{busy ? "Сохраняем..." : "Сохранить вариант"}</button></div>
    </section>
  );
}

function VariantStats({ stats, onClose }: { stats: StatsPayload; onClose: () => void }) {
  const attempts = stats.attempts;
  const average = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length) : 0;
  const slots = Math.max(0, ...attempts.flatMap((attempt) => attempt.results.map((result) => result.slot)));
  const taskStats = Array.from({ length: slots }, (_, index) => {
    const slot = index + 1;
    const attempted = attempts.map((attempt) => attempt.results.find((result) => result.slot === slot)).filter(Boolean) as AttemptResult[];
    const correct = attempted.filter((result) => result.correct).length;
    return { slot, percent: attempted.length ? Math.round(correct / attempted.length * 100) : 0 };
  });
  const distribution = [...new Set(attempts.map((attempt) => attempt.score))].sort((a, b) => a - b).map((score) => ({ score, count: attempts.filter((attempt) => attempt.score === score).length }));
  const maxCount = Math.max(1, ...distribution.map((item) => item.count));

  return (
    <section className="teacher-stats-page">
      <header className="teacher-editor-header"><button onClick={onClose}><X /> Закрыть</button><div><p>КИМ {stats.kim}</p><h2>Статистика варианта</h2></div></header>
      <div className="teacher-stats-summary"><div><span>Работ сдано</span><strong>{attempts.length}</strong></div><div><span>Средний балл</span><strong>{average}</strong></div><div><span>Заданий</span><strong>{slots}</strong></div></div>
      {attempts.length ? (
        <>
          <div className="teacher-chart-grid">
            <section><div className="teacher-chart-title"><h3>Распределение баллов</h3><span>Количество учеников</span></div><div className="teacher-bar-chart is-distribution">{distribution.map((item) => <div key={item.score}><i style={{ height: `${Math.max(6, item.count / maxCount * 100)}%` }} title={`${item.count} учеников`} /><span>{item.score}</span></div>)}</div></section>
            <section><div className="teacher-chart-title"><h3>Процент решения заданий</h3><span>Верные ответы по позициям</span></div><div className="teacher-bar-chart">{taskStats.map((item) => <div key={item.slot}><i style={{ height: `${Math.max(2, item.percent)}%` }} title={`${item.percent}%`} /><span>{item.slot}</span></div>)}</div></section>
          </div>
          <section className="teacher-results-section"><div className="teacher-chart-title"><h3>Все ученики</h3><span>Зелёный - верно, красный - ошибка, точка - не приступал</span></div><div className="teacher-results-scroll"><table><thead><tr><th>Ученик</th><th>Сдано</th><th>Время</th><th>Балл</th>{Array.from({ length: slots }, (_, index) => <th key={index}>{index + 1}</th>)}</tr></thead><tbody>{attempts.map((attempt) => <tr key={attempt.id}><td>{attempt.student_name}</td><td>{new Date(attempt.completed_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td><td>{formatDuration(attempt.duration_seconds)}</td><td><b>{attempt.score}</b></td>{Array.from({ length: slots }, (_, index) => { const result = attempt.results.find((item) => item.slot === index + 1); const status = !result?.answered ? "is-empty" : result.correct ? "is-correct" : "is-wrong"; return <td className={status} key={index}>{!result?.answered ? "·" : result.correct ? <Check /> : <X />}</td>; })}</tr>)}</tbody><tfoot><tr><td colSpan={4}>Процент решения</td>{taskStats.map((item) => <td key={item.slot}>{item.percent}%</td>)}</tr></tfoot></table></div></section>
        </>
      ) : <div className="teacher-large-empty"><BarChart3 /><h3>Результатов пока нет</h3><p>Статистика появится после первой сдачи варианта.</p></div>}
    </section>
  );
}

export default function TeacherStudio({ section, onSectionChange }: { section: StudioSection; onSectionChange: (section: StudioSection) => void }) {
  const [data, setData] = useState<StudioPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingTask, setEditingTask] = useState<TaskRow | null | undefined>(undefined);
  const [editingVariant, setEditingVariant] = useState<VariantRow | null | undefined>(undefined);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    studioRequest<StudioPayload>("/api/teacher-studio")
      .then((payload) => { if (active) setData(payload); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Не удалось открыть материалы"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const showMessage = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 2600); };
  const applyPayload = (payload: StudioPayload, text: string) => { setData(payload); setEditingTask(undefined); setEditingVariant(undefined); showMessage(text); };
  const run = async (body: Record<string, unknown>, success: string) => {
    setBusy(true); setError("");
    try { const payload = await studioRequest<StudioPayload>("/api/teacher-studio", { method: "POST", body: JSON.stringify(body) }); setData(payload); showMessage(success); }
    catch (runError) { setError(runError instanceof Error ? runError.message : "Не удалось выполнить действие"); }
    finally { setBusy(false); }
  };
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await run({ action: "create_folder", kind: section, parentId: currentFolder, name: newFolderName }, "Папка создана");
    setNewFolderName(""); setNewFolderOpen(false);
  };
  const currentFolderRow = data?.folders.find((folder) => folder.id === currentFolder) ?? null;
  const breadcrumbs = useMemo(() => {
    if (!data || !currentFolderRow) return [] as FolderRow[];
    const result: FolderRow[] = [];
    let cursor: FolderRow | undefined = currentFolderRow;
    while (cursor) { result.unshift(cursor); cursor = data.folders.find((folder) => folder.id === cursor?.parent_id); }
    return result;
  }, [currentFolderRow, data]);
  const visibleFolders = (data?.folders ?? []).filter((folder) => folder.kind === section && folder.parent_id === currentFolder && (!search || folder.name.toLowerCase().includes(search.toLowerCase())));
  const visibleTasks = (data?.tasks ?? []).filter((task) => section === "tasks" && task.folder_id === currentFolder && (!search || task.public_id.includes(search) || task.note.toLowerCase().includes(search.toLowerCase())));
  const visibleVariants = (data?.variants ?? []).filter((variant) => section === "variants" && variant.folder_id === currentFolder && (!search || variant.kim.includes(search) || variant.title.toLowerCase().includes(search.toLowerCase())));
  const openStats = async (kim: string) => {
    setBusy(true); setError("");
    try { setStats(await studioRequest<StatsPayload>(`/api/teacher-studio?stats=${kim}`)); }
    catch (statsError) { setError(statsError instanceof Error ? statsError.message : "Не удалось открыть статистику"); }
    finally { setBusy(false); }
  };
  const copyVariantLink = async (kim: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/variants?kim=${kim}`);
    showMessage("Ссылка на вариант скопирована");
  };
  const dropOnFolder = (event: React.DragEvent, folderId: number) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    const kind = event.dataTransfer.getData("application/x-egege-kind");
    if (kind === "tasks") void run({ action: "move_task", publicId: id, folderId }, "Задание перемещено");
    if (kind === "variants") void run({ action: "move_variant", kim: id, folderId }, "Вариант перемещён");
  };

  if (editingTask !== undefined && data) return <TaskEditor task={editingTask} folders={data.folders} initialFolder={currentFolder} onClose={() => setEditingTask(undefined)} onSaved={applyPayload} />;
  if (editingVariant !== undefined && data) return <VariantEditor variant={editingVariant} folders={data.folders} initialFolder={currentFolder} onClose={() => setEditingVariant(undefined)} onSaved={applyPayload} />;
  if (stats) return <VariantStats stats={stats} onClose={() => setStats(null)} />;

  return (
    <div className="teacher-studio">
      <section className="teacher-studio-hero"><div><p>Рабочее пространство учителя</p><h1>{section === "variants" ? "Мои варианты" : "Мои задания"}</h1><span>{section === "variants" ? "Собирайте варианты по ID и следите за результатами учеников." : "Создавайте свои задания с формулами, таблицами, изображениями и разборами."}</span></div><button className="teacher-primary" onClick={() => section === "tasks" ? setEditingTask(null) : setEditingVariant(null)}><Plus /> {section === "tasks" ? "Новое задание" : "Новый вариант"}</button></section>
      <nav className="teacher-material-tabs" aria-label="Материалы учителя"><button className={section === "variants" ? "is-active" : ""} onClick={() => onSectionChange("variants")}>Мои варианты <span>{data?.variants.length ?? 0}</span></button><button className={section === "tasks" ? "is-active" : ""} onClick={() => onSectionChange("tasks")}>Мои задания <span>{data?.tasks.length ?? 0}</span></button></nav>
      <section className="teacher-explorer">
        <div className="teacher-explorer-toolbar">
          <div className="teacher-breadcrumbs"><button onClick={() => setCurrentFolder(null)}>Все материалы</button>{breadcrumbs.map((folder) => <span key={folder.id}><ChevronRight /><button onClick={() => setCurrentFolder(folder.id)}>{folder.name}</button></span>)}</div>
          <div className="teacher-explorer-actions"><label><span className="sr-only">Поиск</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по названию или ID" /></label><button onClick={() => setNewFolderOpen((open) => !open)}><FolderPlus /> Папка</button></div>
        </div>
        {newFolderOpen && <form className="teacher-new-folder" onSubmit={(event) => { event.preventDefault(); void createFolder(); }}><Folder /><input autoFocus value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Название папки" maxLength={64} /><button className="teacher-primary" disabled={busy}>Создать</button><button type="button" onClick={() => setNewFolderOpen(false)}>Отмена</button></form>}
        {loading ? <div className="teacher-loading"><i /><i /><i /></div> : (
          <div className="teacher-explorer-list">
            {visibleFolders.map((folder) => <article className="teacher-folder-row" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOnFolder(event, folder.id)} key={folder.id}><button className="teacher-row-main" onClick={() => setCurrentFolder(folder.id)}><Folder /><span><strong>{folder.name}</strong><small>Папка</small></span></button><div><button onClick={() => { const name = window.prompt("Новое название", folder.name); if (name) void run({ action: "rename_folder", id: folder.id, name }, "Папка переименована"); }} aria-label={`Переименовать ${folder.name}`}><Pencil /></button><button onClick={() => { if (window.confirm(`Удалить папку «${folder.name}»? Материалы останутся.`)) void run({ action: "delete_folder", id: folder.id }, "Папка удалена"); }} aria-label={`Удалить ${folder.name}`}><Trash2 /></button></div></article>)}
            {visibleTasks.map((task) => <article className="teacher-material-row" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", task.public_id); event.dataTransfer.setData("application/x-egege-kind", "tasks"); }} key={task.public_id}><button className="teacher-row-main" onClick={() => setEditingTask(task)}><FilePlus2 /><span><strong>{task.note || `Задание №${task.exam_number}`}</strong><small>ID {task.public_id} · №{task.exam_number} · {formatDate(task.updated_at)}</small></span></button><div><button onClick={() => setEditingTask(task)} aria-label={`Редактировать ${task.public_id}`}><Pencil /></button><button onClick={() => { if (window.confirm(`Удалить задание ${task.public_id}? Оно исчезнет из ваших вариантов.`)) void run({ action: "delete_task", publicId: task.public_id }, "Задание удалено"); }} aria-label={`Удалить ${task.public_id}`}><Trash2 /></button></div></article>)}
            {visibleVariants.map((variant) => <article className="teacher-material-row" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", variant.kim); event.dataTransfer.setData("application/x-egege-kind", "variants"); }} key={variant.kim}><button className="teacher-row-main" onClick={() => setEditingVariant(variant)}><span className="teacher-kim-mark">КИМ</span><span><strong>{variant.title}</strong><small>{variant.kim} · {variant.task_ids.length} заданий · {formatDate(variant.updated_at)}</small></span></button><span className="teacher-attempt-count">{variant.attempts_count || 0} работ</span><div><button onClick={() => void copyVariantLink(variant.kim)} aria-label={`Копировать ссылку на ${variant.kim}`}><Copy /></button><button onClick={() => void openStats(variant.kim)} aria-label={`Статистика ${variant.kim}`}><BarChart3 /></button><button onClick={() => setEditingVariant(variant)} aria-label={`Редактировать ${variant.kim}`}><Pencil /></button><button onClick={() => { if (window.confirm(`Удалить вариант ${variant.kim} и его статистику?`)) void run({ action: "delete_variant", kim: variant.kim }, "Вариант удалён"); }} aria-label={`Удалить ${variant.kim}`}><Trash2 /></button></div></article>)}
            {!visibleFolders.length && !visibleTasks.length && !visibleVariants.length && <div className="teacher-large-empty"><Folder /><h3>{search ? "Ничего не найдено" : "Здесь пока пусто"}</h3><p>{search ? "Измените запрос или откройте другую папку." : `Создайте ${section === "tasks" ? "первое задание" : "первый вариант"} или новую папку.`}</p><button className="teacher-primary" onClick={() => section === "tasks" ? setEditingTask(null) : setEditingVariant(null)}><Plus /> Создать</button></div>}
          </div>
        )}
      </section>
      {message && <div className="teacher-toast" role="status"><Check />{message}</div>}
      {error && <div className="teacher-toast is-error" role="alert"><X />{error}<button onClick={() => setError("")}>Закрыть</button></div>}
    </div>
  );
}
