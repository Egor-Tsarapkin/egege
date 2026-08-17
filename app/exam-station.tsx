"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Download,
  Expand,
  HelpCircle,
  Info,
  Save,
  X,
} from "lucide-react";
import { taskDownloadHref, taskDownloadName } from "@/lib/task-download";
import RichHtml from "./rich-html";

type ExamTask = {
  id: string;
  slot?: number;
  number: number;
  html: string;
  table: { cols: number; rows: number };
  files: Array<{ name: string; href: string }>;
  answer?: string;
  solution?: { html: string; videoUrl: string; timecode: number };
};

type ExamVariant = {
  kim: string;
  title: string;
  sourceUrl: string;
  sourceLabel?: string;
  descriptionHtml?: string;
  noTime?: boolean;
  hideAnswers?: boolean;
  oneAttempt?: boolean;
  custom?: boolean;
  tasks: ExamTask[];
};

function getExamTaskHtml(task: ExamTask) {
  if (task.number !== 20 && task.number !== 21) return task.html;

  const secondParagraphStart = task.html.search(/<\/p>\s*<p(?:\s|>)/i);
  if (secondParagraphStart >= 0) {
    const nextParagraph = task.html.indexOf("<p", secondParagraphStart + 4);
    if (nextParagraph >= 0) return task.html.slice(nextParagraph);
  }

  const referenceStart = task.html.search(
    /<p[^>]*>\s*Для(?:\s|&nbsp;)*игры,(?:\s|&nbsp;)*описанной в задании(?:\s|&nbsp;)*19/i,
  );
  return referenceStart >= 0 ? task.html.slice(referenceStart) : task.html;
}

export type ExamAttempt = {
  kim: string;
  title: string;
  testScore: number;
  correctCount: number;
  answeredCount: number;
  durationSeconds: number;
  completedAt: string;
  results?: Array<{
    slot: number;
    taskId: string;
    taskNumber: number;
    answered: boolean;
    correct: boolean;
    points: number;
  }>;
};

type Answers = Record<number, string[]>;

const EXAM_DURATION_SECONDS = 3 * 60 * 60 + 55 * 60;
const LEGACY_STORAGE_KEY = "egege-exam-25135392-v1";
const SCORE_SCALE: Record<number, number> = {
  0: 0, 1: 7, 2: 14, 3: 20, 4: 27, 5: 34, 6: 40, 7: 43, 8: 46,
  9: 48, 10: 51, 11: 54, 12: 56, 13: 59, 14: 62, 15: 64, 16: 67,
  17: 70, 18: 72, 19: 75, 20: 78, 21: 80, 22: 83, 23: 85, 24: 88,
  25: 90, 26: 93, 27: 95, 28: 98, 29: 100,
};

function normalizeAnswers(value: unknown): Answers {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, answer]) => {
      const taskNumber = Number(key);
      if (!Number.isInteger(taskNumber)) return [];
      if (Array.isArray(answer)) {
        return [[taskNumber, answer.map((item) => String(item ?? ""))]];
      }
      if (typeof answer === "string" || typeof answer === "number") {
        return [[taskNumber, [String(answer)]]];
      }
      return [];
    }),
  );
}

function getStorageKey(kim: string) {
  return `egege-exam-${kim}-v3`;
}

function readExamDraft(kim: string) {
  if (typeof window === "undefined") {
    return {
      answers: {} as Answers,
      drafts: {} as Answers,
      secondsLeft: EXAM_DURATION_SECONDS,
    };
  }
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(getStorageKey(kim)) ??
        (kim === "25135392" ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null) ??
        "{}",
    ) as {
      answers?: Answers;
      drafts?: Answers;
      secondsLeft?: number;
    };
    return {
      answers: normalizeAnswers(saved.answers),
      drafts: normalizeAnswers(saved.drafts ?? saved.answers),
      secondsLeft:
        typeof saved.secondsLeft === "number" ? saved.secondsLeft : EXAM_DURATION_SECONDS,
    };
  } catch {
    return {
      answers: {} as Answers,
      drafts: {} as Answers,
      secondsLeft: EXAM_DURATION_SECONDS,
    };
  }
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, "0")).join(":");
}

function isAnswerFilled(values: string[] | undefined) {
  return Boolean(values?.some((value) => value.trim()));
}

function normalizeAnswer(values: string[] | string | undefined) {
  const text = Array.isArray(values) ? values.join(" ") : values ?? "";
  return text.toLowerCase().replace(/\s+/g, "");
}

function formatResultAnswer(value: string | undefined) {
  return (value ?? "").replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

function getInputCount(task: ExamTask) {
  const cols = Math.max(1, task.table.cols || 1);
  const rows = Math.max(1, task.table.rows || 1);
  return Math.min(cols * rows, 20);
}

function ExamIntro({ descriptionHtml }: { descriptionHtml?: string }) {
  return (
    <div className="exam-intro">
      {descriptionHtml && (
        <section className="exam-author-intro">
          <p className="exam-intro-kicker">От автора варианта</p>
          <RichHtml className="exam-author-description" html={descriptionHtml} />
        </section>
      )}
      <p className="exam-intro-kicker">Перед началом</p>
      <h1>В заданиях используются следующие соглашения</h1>
      <div className="exam-conventions">
        <p><b>1.</b> Логическое НЕ обозначается <code>¬A</code>.</p>
        <p><b>2.</b> Логическое И обозначается <code>A ∧ B</code> или <code>A &amp; B</code>.</p>
        <p><b>3.</b> Логическое ИЛИ обозначается <code>A ∨ B</code> или <code>A | B</code>.</p>
        <p><b>4.</b> Следование обозначается <code>A → B</code>, а тождество — <code>A ≡ B</code>.</p>
        <p><b>5.</b> Символ <code>1</code> означает истину, символ <code>0</code> — ложь.</p>
        <p>
          <b>6.</b> В ответах записывайте только число или последовательность символов без
          дополнительных пояснений.
        </p>
      </div>
      <div className="exam-intro-note">
        <Info aria-hidden="true" />
        <span>После ввода нажмите «Сохранить ответ». Ответ останется на этом устройстве.</span>
      </div>
    </div>
  );
}

function AnswerFields({
  task,
  values,
  onChange,
}: {
  task: ExamTask;
  values: string[];
  onChange: (index: number, value: string) => void;
}) {
  const count = getInputCount(task);
  const isTable = count > 1;
  const cols = Math.max(1, task.table.cols || 1);
  const rows = Math.ceil(count / cols);
  const fieldsRef = useRef<HTMLDivElement>(null);

  if (!isTable) {
    return (
      <div className="exam-answer-fields">
        <label>
          <span>Ответ</span>
          <input
            aria-label={`Ответ на задание ${task.number}`}
            autoComplete="off"
            inputMode={task.number === 2 ? "text" : "numeric"}
            value={values[0] ?? ""}
            onChange={(event) => onChange(0, event.target.value)}
          />
        </label>
      </div>
    );
  }

  const focusCell = (index: number) => {
    fieldsRef.current
      ?.querySelector<HTMLInputElement>(`[data-answer-cell="${index}"]`)
      ?.focus();
  };

  const pasteTable = (
    event: React.ClipboardEvent<HTMLInputElement>,
    startIndex: number,
  ) => {
    const clipboard = event.clipboardData.getData("text").replace(/\r/g, "");
    const cells = clipboard.trim().split(/\s+/).filter(Boolean);
    if (cells.length <= 1) return;

    event.preventDefault();
    cells.forEach((cell, offset) => {
      const index = startIndex + offset;
      if (index < count) onChange(index, cell);
    });

    if (startIndex === 0) {
      const scrollArea = fieldsRef.current?.querySelector<HTMLElement>(".exam-answer-table-scroll");
      if (scrollArea) scrollArea.scrollTop = 0;
    }
  };

  return (
    <div className={`exam-answer-table ${count <= 4 ? "is-compact" : ""}`} ref={fieldsRef}>
      <div className="exam-answer-table-heading">
        <strong>Ответ в виде таблицы</strong>
        <span>Можно вставить весь массив сразу</span>
      </div>
      <div className="exam-answer-table-scroll">
        <table>
          <thead>
            <tr>
              <th aria-label="Номер строки" />
              {Array.from({ length: cols }, (_, col) => (
                <th scope="col" key={col}>{col + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row}>
                <th scope="row">{row + 1}</th>
                {Array.from({ length: cols }, (_, col) => {
                  const index = row * cols + col;
                  if (index >= count) return <td key={col} />;
                  return (
                    <td key={col}>
                      <input
                        aria-label={`Строка ${row + 1}, столбец ${col + 1}`}
                        autoComplete="off"
                        data-answer-cell={index}
                        inputMode="text"
                        value={values[index] ?? ""}
                        onChange={(event) => onChange(index, event.target.value)}
                        onPaste={(event) => pasteTable(event, index)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          const next = index + cols < count ? index + cols : index + 1;
                          focusCell(Math.min(next, count - 1));
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="exam-answer-table-hint">
        Скопируйте строки из таблицы или файла и вставьте в верхнюю левую ячейку.
      </p>
    </div>
  );
}

export default function ExamStation({
  variant,
  onClose,
  onFinish,
}: {
  variant: ExamVariant;
  onClose: () => void;
  onFinish?: (attempt: ExamAttempt) => void;
}) {
  const [currentNumber, setCurrentNumber] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => readExamDraft(variant.kim).answers);
  const [drafts, setDrafts] = useState<Answers>(() => readExamDraft(variant.kim).drafts);
  const [secondsLeft, setSecondsLeft] = useState(() => readExamDraft(variant.kim).secondsLeft);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [navWindowStart, setNavWindowStart] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const examTasks = useMemo(
    () => variant.tasks.map((task, index) => ({ ...task, slot: task.slot ?? index + 1 })),
    [variant.tasks],
  );
  const taskCount = examTasks.length;
  const currentTask = examTasks.find((task) => task.slot === currentNumber) ?? null;
  const answeredCount = useMemo(
    () => examTasks.filter((task) => isAnswerFilled(answers[task.slot ?? 0])).length,
    [answers, examTasks],
  );
  const resultRows = useMemo(() => examTasks.map((task) => {
    const slot = task.slot ?? 0;
    const userAnswer = answers[slot] ?? [];
    const correct = Boolean(task.answer) &&
      normalizeAnswer(userAnswer) === normalizeAnswer(task.answer);
    const maxPoints = task.number === 26 || task.number === 27 ? 2 : 1;
    return {
      task,
      slot,
      userAnswer: formatResultAnswer(userAnswer.join("\n")),
      correctAnswer: formatResultAnswer(task.answer),
      correct,
      points: correct ? maxPoints : 0,
    };
  }), [answers, examTasks]);
  const primaryScore = resultRows.reduce((total, row) => total + row.points, 0);
  const maxPrimaryScore = resultRows.reduce((total, row) => total + (row.task.number >= 26 ? 2 : 1), 0);
  const testScore = variant.custom
    ? Math.round(primaryScore / Math.max(1, maxPrimaryScore) * 100)
    : SCORE_SCALE[primaryScore] ?? 0;
  const correctCount = resultRows.filter((row) => row.correct).length;
  const durationSeconds = variant.noTime ? elapsedSeconds : EXAM_DURATION_SECONDS - secondsLeft;
  const resultColumns = [
    resultRows.slice(0, Math.ceil(resultRows.length / 2)),
    resultRows.slice(Math.ceil(resultRows.length / 2)),
  ];
  const changeTask = useCallback((number: number) => {
    const nextNumber = Math.max(0, Math.min(taskCount, number));
    setCurrentNumber(nextNumber);
    if (nextNumber > 0) {
      const index = nextNumber - 1;
      setNavWindowStart((current) => {
        if (index < current) return index;
        if (index >= current + 8) return index - 7;
        return current;
      });
    }
  }, [taskCount]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => {
      if (variant.noTime) setElapsedSeconds((value) => value + 1);
      else setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished, variant.noTime]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        getStorageKey(variant.kim),
        JSON.stringify({ answers, drafts, secondsLeft }),
      );
    } catch {
      // The exam remains usable if local storage is unavailable.
    }
  }, [answers, drafts, secondsLeft, variant.kim]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentNumber]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirmFinish) setConfirmFinish(false);
        else if (helpOpen) setHelpOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea")) return;
      if (event.key === "ArrowRight") changeTask(currentNumber + 1);
      if (event.key === "ArrowLeft") changeTask(currentNumber - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeTask, confirmFinish, currentNumber, helpOpen]);

  const updateAnswer = (index: number, value: string) => {
    if (!currentTask) return;
    const slot = currentTask.slot ?? 0;
    setDrafts((current) => {
      const nextValues = [...(current[slot] ?? [])];
      nextValues[index] = value;
      return { ...current, [slot]: nextValues };
    });
  };

  const saveCurrentAnswer = () => {
    if (!currentTask) return;
    const slot = currentTask.slot ?? 0;
    const nextValues = drafts[slot] ?? [];
    if (!isAnswerFilled(nextValues)) return;
    setAnswers((current) => ({ ...current, [slot]: [...nextValues] }));
  };

  const currentSlot = currentTask?.slot ?? 0;
  const currentDraft = currentTask ? drafts[currentSlot] ?? [] : [];
  const currentSavedAnswer = currentTask ? answers[currentSlot] ?? [] : [];
  const hasCurrentDraft = isAnswerFilled(currentDraft);
  const isCurrentAnswerSaved =
    hasCurrentDraft &&
    JSON.stringify(currentDraft) === JSON.stringify(currentSavedAnswer);

  const visibleTaskNumbers = Array.from({ length: 8 }, (_, index) => navWindowStart + index + 1)
    .filter((number) => number <= taskCount);

  if (finished) {
    return (
      <div className="exam-station exam-result-screen" role="dialog" aria-modal="true" aria-label="Результаты экзамена">
        <header className="exam-results-title">
          <span>EGEGE</span>
          <b>Результаты варианта</b>
          <button onClick={onClose} aria-label="Закрыть результаты">
            <X aria-hidden="true" />
          </button>
        </header>
        <main className="exam-result-card">
          <section className="exam-result-hero">
            <div className="exam-result-heading">
              <p>Экзамен завершён</p>
              <h1>КИМ № {variant.kim}</h1>
              <span>Все ответы собраны в одной понятной сводке.</span>
            </div>
            <div className="exam-result-score">
              <span>Тестовый балл</span>
              <strong>{testScore}<small>/100</small></strong>
            </div>
            <div className="exam-result-metrics">
              <div>
                <strong>{formatTime(durationSeconds)}</strong>
                <span>время решения</span>
              </div>
              <div>
                <strong>{correctCount}<small>/{taskCount}</small></strong>
                <span>верных ответов</span>
              </div>
              <div>
                <strong>{answeredCount}<small>/{taskCount}</small></strong>
                <span>ответов дано</span>
              </div>
            </div>
          </section>

          <section className="exam-result-table-wrap">
            <div className="exam-result-section-heading">
              <div>
                <p>Подробная проверка</p>
                <h2>Ответы по заданиям</h2>
              </div>
              <div className="exam-result-legend">
                <span><i className="is-correct" /> Верно</span>
                <span><i className="is-wrong" /> Ошибка</span>
                <span><i className="is-empty" /> Нет ответа</span>
              </div>
            </div>
            <div className="exam-result-tables">
              {resultColumns.map((rows, column) => (
                <div className="exam-result-table" role="table" aria-label={`Результаты, часть ${column + 1}`} key={column}>
                  <div className="exam-result-row exam-result-row-head" role="row">
                    <span>№</span>
                    <span>Балл</span>
                    <span>Ваш ответ</span>
                    <span>Правильный ответ</span>
                  </div>
                  {rows.map(({ task, slot, userAnswer, correctAnswer, correct, points }) => {
                    const status = !userAnswer ? "is-empty" : correct ? "is-correct" : "is-wrong";
                    return (
                      <div className={`exam-result-row ${status}`} key={slot} role="row">
                        <b><i />{slot}</b>
                        <span className="exam-result-points">{points} из {task.number >= 26 ? 2 : 1}</span>
                        <span className="exam-result-answer">{userAnswer || "Ответ не дан"}</span>
                        <span className="exam-result-answer">
                          {variant.hideAnswers && !correct ? "Скрыт автором" : correctAnswer || "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          <div className="exam-result-actions">
            {!variant.oneAttempt && (
              <button onClick={() => setFinished(false)}>
                <ArrowLeft aria-hidden="true" />
                Вернуться к варианту
              </button>
            )}
            <button className="is-primary" onClick={onClose}>
              К списку вариантов
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="exam-station" role="dialog" aria-modal="true" aria-label="Экзаменационная станция">
      <header className="exam-topbar">
        <div className="exam-identifiers">
          <strong>КИМ № {variant.kim}</strong>
          <span>{variant.custom ? variant.sourceLabel ?? "Авторский вариант" : "БР № 2832503195017"}</span>
        </div>
        <div className="exam-time" aria-label={variant.noTime ? "Без ограничения времени" : `Осталось ${formatTime(secondsLeft)}`}>
          <span>{variant.noTime ? "Режим" : "Осталось"}</span>
          <b>{variant.noTime ? "Без таймера" : formatTime(secondsLeft)}</b>
        </div>
        <div className="exam-window-actions">
          <button className="exam-finish-button" onClick={() => setConfirmFinish(true)}>
            Завершить экзамен досрочно
          </button>
          <button onClick={() => setHelpOpen(true)} aria-label="Помощь">
            <HelpCircle aria-hidden="true" />
          </button>
          <button
            onClick={() => void document.documentElement.requestFullscreen?.()}
            aria-label="Открыть на весь экран"
          >
            <Expand aria-hidden="true" />
          </button>
          <button onClick={onClose} aria-label="Закрыть станцию">
            <X aria-hidden="true" />
          </button>
        </div>
      </header>

      <aside className="exam-nav" aria-label="Навигация по заданиям">
        <div className="exam-answer-count">
          <span>Дано ответов</span>
          <b>{answeredCount}/{taskCount}</b>
        </div>
        <button
          className="exam-nav-arrow"
          disabled={navWindowStart === 0}
          onClick={() => setNavWindowStart((value) => Math.max(0, value - (
            window.innerWidth <= 390 ? 2 : window.innerWidth <= 720 ? 3 : 4
          )))}
          aria-label="Предыдущие номера"
        >
          <ArrowUp aria-hidden="true" />
        </button>
        <button
          className={`exam-nav-task is-info ${currentNumber === 0 ? "is-current" : ""}`}
          onClick={() => changeTask(0)}
          aria-label="Информация о варианте"
        >
          <Info aria-hidden="true" />
        </button>
        <div className="exam-task-numbers">
          {visibleTaskNumbers.map((number) => (
            <button
              className={`${currentNumber === number ? "is-current" : ""} ${
                isAnswerFilled(answers[number]) ? "is-answered" : ""
              }`}
              onClick={() => changeTask(number)}
              aria-current={currentNumber === number ? "page" : undefined}
              aria-label={`Задание ${number}${isAnswerFilled(answers[number]) ? ", ответ дан" : ""}`}
              key={number}
            >
              {number}
            </button>
          ))}
        </div>
        <button
          className="exam-nav-arrow"
          disabled={navWindowStart >= Math.max(0, taskCount - 8)}
          onClick={() => setNavWindowStart((value) => Math.min(Math.max(0, taskCount - 8), value + (
            window.innerWidth <= 390 ? 2 : window.innerWidth <= 720 ? 3 : 4
          )))}
          aria-label="Следующие номера"
        >
          <ArrowDown aria-hidden="true" />
        </button>
      </aside>

      <main className="exam-workspace">
        <button
          className="exam-side-arrow is-left"
          onClick={() => changeTask(currentNumber - 1)}
          disabled={currentNumber === 0}
          aria-label="Предыдущее задание"
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="exam-paper" ref={contentRef}>
          {currentTask ? (
            <>
              <div className="exam-task-heading">
                <div>
                  <span>Задание {currentNumber} из {taskCount}</span>
                  <h1>Задание № {currentTask.number}</h1>
                </div>
                {variant.sourceUrl
                  ? <a href={variant.sourceUrl} target="_blank" rel="noreferrer">Источник: КЕГЭ</a>
                  : <span className="exam-custom-source">ID {currentTask.id}</span>}
              </div>
              <RichHtml className={`exam-task-html ${currentTask.id.startsWith("0") ? "is-teacher-task" : ""}`} html={getExamTaskHtml(currentTask)} />
            </>
          ) : (
            <ExamIntro descriptionHtml={variant.descriptionHtml} />
          )}
        </div>
        <button
          className="exam-side-arrow is-right"
          onClick={() => changeTask(currentNumber + 1)}
          disabled={currentNumber === taskCount}
          aria-label="Следующее задание"
        >
          <ArrowRight aria-hidden="true" />
        </button>
      </main>

      <footer className={`exam-footer ${currentTask?.files.length ? "has-files" : "no-files"}`}>
        <div className="exam-files">
          {currentTask?.files.map((file) => (
            <a
              href={taskDownloadHref(file.href, file.name, currentTask.id)}
              download={taskDownloadName(file.name, currentTask.id)}
              title={file.name}
              key={file.href}
            >
              <Download aria-hidden="true" />
              <span>{file.name}</span>
            </a>
          ))}
          {!currentTask && <span>{variant.title}</span>}
        </div>
        {currentTask ? (
          <div className={`exam-answer-actions ${getInputCount(currentTask) > 1 ? "has-table-answer" : ""}`}>
            <AnswerFields
              task={currentTask}
              values={currentDraft}
              onChange={updateAnswer}
            />
            <button
              className={`exam-save-answer ${isCurrentAnswerSaved ? "is-saved" : ""}`}
              disabled={!hasCurrentDraft || isCurrentAnswerSaved}
              onClick={saveCurrentAnswer}
              type="button"
            >
              {isCurrentAnswerSaved ? <Check aria-hidden="true" /> : <Save aria-hidden="true" />}
              <span>{isCurrentAnswerSaved ? "Ответ сохранён" : "Сохранить ответ"}</span>
            </button>
          </div>
        ) : (
          <button className="exam-start-button" onClick={() => changeTask(1)}>
            Начать вариант <ArrowRight aria-hidden="true" />
          </button>
        )}
        <div className="exam-mobile-pager">
          <button onClick={() => changeTask(currentNumber - 1)} disabled={currentNumber === 0}>
            <ArrowLeft aria-hidden="true" />
            Назад
          </button>
          <button onClick={() => changeTask(currentNumber + 1)} disabled={currentNumber === taskCount}>
            Далее
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </footer>

      {(confirmFinish || helpOpen) && (
        <div
          className="exam-dialog-layer"
          role="presentation"
          onMouseDown={() => {
            setConfirmFinish(false);
            setHelpOpen(false);
          }}
        >
          <section
            className="exam-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exam-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="exam-dialog-close"
              onClick={() => {
                setConfirmFinish(false);
                setHelpOpen(false);
              }}
              aria-label="Закрыть"
            >
              <X aria-hidden="true" />
            </button>
            {confirmFinish ? (
              <>
                <p className="exam-dialog-kicker">Проверка</p>
                <h2 id="exam-dialog-title">Завершить вариант?</h2>
                <p>
                  Ответы даны на {answeredCount} из {taskCount} заданий.
                  {variant.oneAttempt ? " После сдачи повторный запуск будет недоступен." : " Из итогового экрана можно вернуться к работе."}
                </p>
                <div className="exam-dialog-actions">
                  <button onClick={() => setConfirmFinish(false)}>Продолжить решать</button>
                  <button className="is-primary" onClick={() => {
                    setConfirmFinish(false);
                    setFinished(true);
                    onFinish?.({
                      kim: variant.kim,
                      title: variant.title,
                      testScore,
                      correctCount,
                      answeredCount,
                      durationSeconds,
                      completedAt: new Date().toISOString(),
                      results: resultRows.map((row) => ({
                        slot: row.slot,
                        taskId: row.task.id,
                        taskNumber: row.task.number,
                        answered: Boolean(row.userAnswer),
                        correct: row.correct,
                        points: row.points,
                      })),
                    });
                  }}>
                    Завершить
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="exam-dialog-kicker">Навигация</p>
                <h2 id="exam-dialog-title">Как пользоваться станцией</h2>
                <p>
                  Выбирайте задания по номерам, переходите стрелками и вводите ответ в нижней
                  панели. Заполненные задания отмечаются акцентной точкой.
                </p>
                <div className="exam-help-keys">
                  <span><kbd>←</kbd><kbd>→</kbd> соседние задания</span>
                  <span><kbd>Esc</kbd> закрыть окно</span>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
