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

type ExamTask = {
  id: string;
  number: number;
  html: string;
  table: { cols: number; rows: number };
  files: Array<{ name: string; href: string }>;
};

type ExamVariant = {
  kim: string;
  title: string;
  sourceUrl: string;
  tasks: ExamTask[];
};

type Answers = Record<number, string[]>;

const EXAM_DURATION_SECONDS = 3 * 60 * 60 + 55 * 60;
const STORAGE_KEY = "egege-exam-25135392-v2";
const LEGACY_STORAGE_KEY = "egege-exam-25135392-v1";

function readExamDraft() {
  if (typeof window === "undefined") {
    return {
      answers: {} as Answers,
      drafts: {} as Answers,
      secondsLeft: EXAM_DURATION_SECONDS,
    };
  }
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_STORAGE_KEY) ??
        "{}",
    ) as {
      answers?: Answers;
      drafts?: Answers;
      secondsLeft?: number;
    };
    return {
      answers: saved.answers ?? {},
      drafts: saved.drafts ?? saved.answers ?? {},
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

function getInputCount(task: ExamTask) {
  const cols = Math.max(1, task.table.cols || 1);
  const rows = Math.max(1, task.table.rows || 1);
  return Math.min(cols * rows, 20);
}

function ExamIntro() {
  return (
    <div className="exam-intro">
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
    const lines = clipboard.split("\n");
    while (lines.length > 1 && lines.at(-1) === "") lines.pop();

    const matrix = lines.map((line) => line.split("\t"));
    const containsTable = matrix.length > 1 || matrix.some((line) => line.length > 1);
    if (!containsTable) return;

    event.preventDefault();
    const startRow = Math.floor(startIndex / cols);
    const startCol = startIndex % cols;

    matrix.forEach((line, rowOffset) => {
      line.forEach((cell, colOffset) => {
        const row = startRow + rowOffset;
        const col = startCol + colOffset;
        const index = row * cols + col;
        if (row < rows && col < cols && index < count) {
          onChange(index, cell.trim());
        }
      });
    });

    if (startIndex === 0) {
      fieldsRef.current?.querySelector(".exam-answer-table-scroll")?.scrollTo({ top: 0 });
    }
  };

  return (
    <div className="exam-answer-table" ref={fieldsRef}>
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
}: {
  variant: ExamVariant;
  onClose: () => void;
}) {
  const [currentNumber, setCurrentNumber] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => readExamDraft().answers);
  const [drafts, setDrafts] = useState<Answers>(() => readExamDraft().drafts);
  const [secondsLeft, setSecondsLeft] = useState(() => readExamDraft().secondsLeft);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [navWindowStart, setNavWindowStart] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const currentTask = variant.tasks.find((task) => task.number === currentNumber) ?? null;
  const answeredCount = useMemo(
    () => variant.tasks.filter((task) => isAnswerFilled(answers[task.number])).length,
    [answers, variant.tasks],
  );
  const changeTask = useCallback((number: number) => {
    const nextNumber = Math.max(0, Math.min(27, number));
    setCurrentNumber(nextNumber);
    if (nextNumber > 0) {
      const index = nextNumber - 1;
      setNavWindowStart((current) => {
        if (index < current) return index;
        if (index >= current + 8) return index - 7;
        return current;
      });
    }
  }, []);

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
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers, drafts, secondsLeft }),
      );
    } catch {
      // The exam remains usable if local storage is unavailable.
    }
  }, [answers, drafts, secondsLeft]);

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
    setDrafts((current) => {
      const nextValues = [...(current[currentTask.number] ?? [])];
      nextValues[index] = value;
      return { ...current, [currentTask.number]: nextValues };
    });
  };

  const saveCurrentAnswer = () => {
    if (!currentTask) return;
    const nextValues = drafts[currentTask.number] ?? [];
    if (!isAnswerFilled(nextValues)) return;
    setAnswers((current) => ({ ...current, [currentTask.number]: [...nextValues] }));
  };

  const currentDraft = currentTask ? drafts[currentTask.number] ?? [] : [];
  const currentSavedAnswer = currentTask ? answers[currentTask.number] ?? [] : [];
  const hasCurrentDraft = isAnswerFilled(currentDraft);
  const isCurrentAnswerSaved =
    hasCurrentDraft &&
    JSON.stringify(currentDraft) === JSON.stringify(currentSavedAnswer);

  const visibleTaskNumbers = Array.from({ length: 8 }, (_, index) => navWindowStart + index + 1)
    .filter((number) => number <= 27);

  if (finished) {
    return (
      <div className="exam-station exam-result-screen">
        <section className="exam-result-card">
          <span className="exam-result-icon"><Check aria-hidden="true" /></span>
          <p className="exam-result-kicker">Вариант завершён</p>
          <h1>Ответы сохранены</h1>
          <p>
            Вы ответили на <b>{answeredCount}</b> из 27 заданий. В этой тестовой версии
            станция не отправляет работу на проверку.
          </p>
          <div className="exam-result-actions">
            <button onClick={() => setFinished(false)}>Вернуться к работе</button>
            <button className="is-primary" onClick={onClose}>К вариантам</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="exam-station">
      <header className="exam-topbar">
        <div className="exam-identifiers">
          <strong>КИМ № {variant.kim}</strong>
          <span>БР № 2832503195017</span>
        </div>
        <div className="exam-time" aria-label={`Осталось ${formatTime(secondsLeft)}`}>
          <span>Осталось</span>
          <b>{formatTime(secondsLeft)}</b>
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
          <b>{answeredCount}/27</b>
        </div>
        <button
          className="exam-nav-arrow"
          disabled={navWindowStart === 0}
          onClick={() => setNavWindowStart((value) => Math.max(0, value - 1))}
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
          disabled={navWindowStart >= 19}
          onClick={() => setNavWindowStart((value) => Math.min(19, value + 1))}
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
                  <span>Задание {currentTask.number} из 27</span>
                  <h1>Задание № {currentTask.number}</h1>
                </div>
                <a href={variant.sourceUrl} target="_blank" rel="noreferrer">Источник: КЕГЭ</a>
              </div>
              <div
                className="exam-task-html"
                dangerouslySetInnerHTML={{ __html: currentTask.html }}
              />
            </>
          ) : (
            <ExamIntro />
          )}
        </div>
        <button
          className="exam-side-arrow is-right"
          onClick={() => changeTask(currentNumber + 1)}
          disabled={currentNumber === 27}
          aria-label="Следующее задание"
        >
          <ArrowRight aria-hidden="true" />
        </button>
      </main>

      <footer className="exam-footer">
        <div className="exam-files">
          {currentTask?.files.map((file) => (
            <a href={file.href} key={file.href} target="_blank" rel="noreferrer">
              <Download aria-hidden="true" />
              <span>{file.name}</span>
            </a>
          ))}
          {!currentTask?.files.length && currentTask && <span>Дополнительных файлов нет</span>}
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
          <button onClick={() => changeTask(currentNumber + 1)} disabled={currentNumber === 27}>
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
                  Ответы даны на {answeredCount} из 27 заданий. Вы сможете вернуться к работе
                  из итогового экрана.
                </p>
                <div className="exam-dialog-actions">
                  <button onClick={() => setConfirmFinish(false)}>Продолжить решать</button>
                  <button className="is-primary" onClick={() => {
                    setConfirmFinish(false);
                    setFinished(true);
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
