"use client";

import { useEffect, useMemo, useState } from "react";

type TheorySpaceProps = {
  userId: string;
};

type Planet = {
  id: number;
  chapter: string;
  title: string;
  description: string;
};

const planets: Planet[] = [
  {
    id: 0,
    chapter: "Глава 0",
    title: "Как думает компьютер",
    description: "Порядок команд, print, первые ошибки и отступы.",
  },
  {
    id: 1,
    chapter: "Глава 1",
    title: "Данные и переменные",
    description: "Как программа запоминает и изменяет значения.",
  },
  {
    id: 2,
    chapter: "Глава 2",
    title: "Условия и логика",
    description: "Как код принимает решения и выбирает маршрут.",
  },
];

const lessonIds = ["route", "algorithm", "print", "errors", "indent"] as const;
type LessonId = (typeof lessonIds)[number];

const lessonTitles: Record<LessonId, string> = {
  route: "Строка за строкой",
  algorithm: "Последовательность команд",
  print: "Голос программы",
  errors: "Ошибки — это подсказки",
  indent: "Отступы собирают блоки",
};

function PlanetSphere({
  progress,
  variant = 0,
  complete = false,
}: {
  progress: number;
  variant?: number;
  complete?: boolean;
}) {
  return (
    <span
      className={`theory-planet-sphere planet-variant-${variant} ${
        complete ? "is-complete" : ""
      }`}
      style={{ "--planet-progress": `${progress}%` } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="theory-planet-liquid" />
      {variant === 0 && (
        <>
          <i className="planet-crater crater-one" />
          <i className="planet-crater crater-two" />
          <i className="planet-crater crater-three" />
        </>
      )}
      {variant === 1 && (
        <span className="planet-data-pattern">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
      {variant === 2 && (
        <span className="planet-logic-pattern">
          <i />
          <i />
          <i />
        </span>
      )}
    </span>
  );
}

function MascotRocket({ atNextPlanet }: { atNextPlanet: boolean }) {
  return (
    <span className={`theory-rocket ${atNextPlanet ? "is-at-next" : ""}`} aria-hidden="true">
      <span className="rocket-flame" />
      <span className="rocket-fin rocket-fin-left" />
      <span className="rocket-fin rocket-fin-right" />
      <span className="rocket-body">
        <span className="rocket-window">
          <i />
          <i />
        </span>
      </span>
    </span>
  );
}

function LessonStatus({
  id,
  completed,
  ready,
  onComplete,
}: {
  id: LessonId;
  completed: boolean;
  ready: boolean;
  onComplete: (id: LessonId) => void;
}) {
  return (
    <button
      className={`theory-complete-button ${completed ? "is-complete" : ""}`}
      disabled={!ready || completed}
      onClick={() => onComplete(id)}
    >
      <span aria-hidden="true">{completed ? "✓" : ready ? "→" : "·"}</span>
      {completed ? "Блок пройден" : ready ? "Завершить блок" : "Сначала попробуйте пример"}
    </button>
  );
}

function ChoiceGroup({
  label,
  options,
  value,
  correct,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  correct: string;
  onChange: (value: string) => void;
}) {
  const answered = Boolean(value);
  const isCorrect = value === correct;

  return (
    <div className="theory-choice-block">
      <p>{label}</p>
      <div className="theory-choices">
        {options.map((option) => (
          <button
            className={`${value === option.value ? "is-selected" : ""} ${
              value === option.value && isCorrect ? "is-correct" : ""
            }`}
            onClick={() => onChange(option.value)}
            key={option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
      {answered && (
        <small className={isCorrect ? "is-correct" : "is-wrong"} role="status">
          {isCorrect
            ? "Верно. Можно двигаться дальше."
            : "Пока нет. Посмотрите на строки и прочитайте их сверху вниз."}
        </small>
      )}
    </div>
  );
}

export default function TheorySpace({ userId }: TheorySpaceProps) {
  const storageKey = `egege-theory-progress-v1:${userId}`;
  const [selectedPlanet, setSelectedPlanet] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<LessonId>>(() => new Set());
  const [infographicTick, setInfographicTick] = useState(0);
  const [infographicReady, setInfographicReady] = useState(false);
  const [algorithmChoice, setAlgorithmChoice] = useState("");
  const [printChoice, setPrintChoice] = useState("");
  const [errorChoice, setErrorChoice] = useState("");
  const [indentChoice, setIndentChoice] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
        setCompletedLessons(
          new Set(saved.filter((item): item is LessonId => lessonIds.includes(item as LessonId))),
        );
      } catch {
        setCompletedLessons(new Set());
      }
    });
  }, [storageKey]);

  useEffect(() => {
    if (selectedPlanet !== 0) return;
    const interval = window.setInterval(() => {
      setInfographicTick((current) => (current + 1) % 12);
    }, 1150);
    const readyTimer = window.setTimeout(() => setInfographicReady(true), 3450);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(readyTimer);
    };
  }, [selectedPlanet]);

  const progress = Math.round((completedLessons.size / lessonIds.length) * 100);
  const executionStep = infographicTick % 4;
  const algorithmStep = infographicTick % 3;
  const activePlanet = useMemo(
    () => planets.find((planet) => planet.id === selectedPlanet) ?? null,
    [selectedPlanet],
  );

  const completeLesson = (id: LessonId) => {
    setCompletedLessons((current) => {
      const updated = new Set(current);
      updated.add(id);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(Array.from(updated)));
      } catch {
        // Progress remains available for the current session.
      }
      return updated;
    });
  };

  const replayChapter = () => {
    setCompletedLessons(new Set());
    setAlgorithmChoice("");
    setPrintChoice("");
    setErrorChoice("");
    setIndentChoice("");
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // The in-memory reset still works.
    }
  };

  const scrollToFirstIncomplete = (completed = completedLessons) => {
    const firstIncomplete = lessonIds.find((lessonId) => !completed.has(lessonId));
    if (!firstIncomplete) return;
    window.setTimeout(() => {
      document.getElementById(`theory-${firstIncomplete}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, 380);
  };

  const openPlanet = (planetId: number) => {
    setSelectedPlanet(planetId);
    if (planetId === 0 && completedLessons.size > 0 && completedLessons.size < lessonIds.length) {
      scrollToFirstIncomplete();
    }
  };

  return (
    <section className={`theory-space ${activePlanet ? "is-chapter-open" : ""}`}>
      <div className="theory-map">
        <div className="theory-stars" aria-hidden="true" />
        <header className="theory-map-header">
          <div>
            <p className="eyebrow">Учебная система</p>
            <h1>Космос знаний</h1>
          </div>
          <div className="theory-overall-progress">
            <span>{progress}%</span>
            <small>первая глава</small>
          </div>
        </header>

        <div className="theory-route" aria-label="Главы теории">
          <span className="route-line route-line-one" aria-hidden="true" />
          <span className="route-line route-line-two" aria-hidden="true" />

          {planets.map((planet) => {
            const isCurrent = planet.id === 0;
            const planetProgress = isCurrent ? progress : 0;
            return (
              <button
                className={`theory-planet theory-planet-${planet.id} ${
                  selectedPlanet === planet.id ? "is-selected" : ""
                } ${isCurrent ? "is-current" : ""}`}
                onClick={() => openPlanet(planet.id)}
                aria-label={`${planet.chapter}. ${planet.title}. ${
                  isCurrent ? `Пройдено ${progress}%` : "Глава готовится"
                }`}
                key={planet.id}
              >
                <PlanetSphere
                  progress={planetProgress}
                  variant={planet.id}
                  complete={planetProgress === 100}
                />
                <span className="theory-planet-label">
                  <small>{planet.chapter}</small>
                  <strong>{planet.title}</strong>
                  <i>{isCurrent ? `${progress}%` : "Скоро"}</i>
                </span>
              </button>
            );
          })}

          <MascotRocket atNextPlanet={progress === 100} />
        </div>

        <p className="theory-map-hint">
          Выберите планету, чтобы открыть главу. Темы можно проходить в своём порядке.
        </p>
      </div>

      {activePlanet && (
        <aside className="theory-chapter" aria-label={`Глава «${activePlanet.title}»`}>
          <header className="theory-chapter-header">
            <button
              className="theory-close"
              onClick={() => setSelectedPlanet(null)}
              aria-label="Вернуться к карте"
            >
              <span aria-hidden="true">←</span>
              <span>К карте</span>
            </button>
            <div className="theory-chapter-progress">
              <span>
                <i style={{ width: `${activePlanet.id === 0 ? progress : 0}%` }} />
              </span>
              <small>{activePlanet.id === 0 ? `${progress}%` : "0%"}</small>
            </div>
          </header>

          {activePlanet.id !== 0 ? (
            <div className="theory-coming-soon">
              <PlanetSphere progress={0} variant={activePlanet.id} />
              <p className="eyebrow">{activePlanet.chapter}</p>
              <h2>{activePlanet.title}</h2>
              <p>{activePlanet.description}</p>
              <span>Глава готовится</span>
              <small>
                В дальнейшем её можно будет открыть сразу — строгой блокировки по порядку не будет.
              </small>
            </div>
          ) : (
            <div className="theory-document">
              <div className="theory-document-title">
                <p className="eyebrow">Глава 0 · Основы</p>
                <h2>Как думает компьютер</h2>
                <p>
                  Компьютер не угадывает наши намерения. Он спокойно выполняет точные команды —
                  одну за другой.
                </p>
                <div className="theory-document-meta">
                  <span>5 блоков</span>
                  <span>≈ 12 минут</span>
                  <span>{completedLessons.size}/5 пройдено</span>
                </div>
              </div>

              <nav className="theory-document-nav" aria-label="Содержание главы">
                {lessonIds.map((lessonId, index) => (
                  <a href={`#theory-${lessonId}`} key={lessonId}>
                    <span>{completedLessons.has(lessonId) ? "✓" : index + 1}</span>
                    {lessonTitles[lessonId]}
                  </a>
                ))}
              </nav>

              <article className="theory-lesson" id="theory-route">
                <div className="theory-lesson-heading">
                  <span>01</span>
                  <div>
                    <p className="eyebrow">Порядок выполнения</p>
                    <h3>Строка за строкой</h3>
                  </div>
                </div>
                <p>
                  Обычно Python начинает с первой строки и движется сверху вниз. Текущая строка
                  выполняется целиком — только после этого программа переходит к следующей.
                </p>
                <div className="theory-execution">
                  <div className="theory-code" aria-label="Пример программы">
                    {['print("Старт")', 'print("Шаг 1")', 'print("Финиш")'].map(
                      (line, index) => (
                        <div
                          className={
                            index === Math.min(executionStep, 2)
                              ? "is-running"
                              : executionStep > index
                                ? "is-done"
                                : ""
                          }
                          key={line}
                        >
                          <span>{index + 1}</span>
                          <code>{line}</code>
                          <i>{executionStep > index ? "✓" : ""}</i>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="theory-console">
                    <span>Вывод</span>
                    <code>
                      {["Старт", "Шаг 1", "Финиш"]
                        .slice(0, Math.min(executionStep + 1, 3))
                        .map((line) => <i key={line}>{line}</i>)}
                    </code>
                  </div>
                  <span className="theory-auto-badge">
                    <i aria-hidden="true" />
                    Автовоспроизведение
                  </span>
                </div>
                <aside className="theory-note">
                  Позже условия и циклы научат программу менять этот прямой маршрут. Но пока
                  главное правило — читать код сверху вниз.
                </aside>
                <LessonStatus
                  id="route"
                  completed={completedLessons.has("route")}
                  ready={infographicReady}
                  onComplete={completeLesson}
                />
              </article>

              <article className="theory-lesson" id="theory-algorithm">
                <div className="theory-lesson-heading">
                  <span>02</span>
                  <div>
                    <p className="eyebrow">Алгоритм</p>
                    <h3>Порядок меняет результат</h3>
                  </div>
                </div>
                <p>
                  Алгоритм — это понятная последовательность команд для получения результата.
                  Если переставить команды, результат тоже может измениться.
                </p>
                <div className="theory-sequence" aria-label="Последовательность работы программы">
                  {["Получить команду", "Выполнить её", "Перейти дальше"].map((label, index) => (
                    <span
                      className={`${index === algorithmStep ? "is-active" : ""} ${
                        index < algorithmStep ? "is-done" : ""
                      }`}
                      key={label}
                    >
                      <i>{index + 1}</i>
                      {label}
                    </span>
                  ))}
                </div>
                <ChoiceGroup
                  label="Какое определение алгоритма верное?"
                  options={[
                    { value: "random", label: "Набор случайных действий" },
                    { value: "sequence", label: "Последовательность понятных команд" },
                    { value: "text", label: "Любой текст в редакторе" },
                  ]}
                  value={algorithmChoice}
                  correct="sequence"
                  onChange={setAlgorithmChoice}
                />
                <LessonStatus
                  id="algorithm"
                  completed={completedLessons.has("algorithm")}
                  ready={algorithmChoice === "sequence"}
                  onComplete={completeLesson}
                />
              </article>

              <article className="theory-lesson" id="theory-print">
                <div className="theory-lesson-heading">
                  <span>03</span>
                  <div>
                    <p className="eyebrow">Первая команда</p>
                    <h3><code>print</code> — голос программы</h3>
                  </div>
                </div>
                <p>
                  Команда <code>print()</code> показывает информацию на экране. Текст записывают
                  в кавычках, а несколько значений внутри скобок разделяют запятыми.
                </p>
                <div className="theory-split-example">
                  <div className="theory-code is-static">
                    <div><span>1</span><code>print(&quot;Счёт&quot;, 3)</code></div>
                  </div>
                  <div className="theory-console">
                    <span>Вывод</span>
                    <code><i>Счёт 3</i></code>
                  </div>
                </div>
                <ChoiceGroup
                  label='Что выведет print("Привет", "мир")?'
                  options={[
                    { value: "together", label: "Приветмир" },
                    { value: "space", label: "Привет мир" },
                    { value: "quotes", label: '"Привет" "мир"' },
                  ]}
                  value={printChoice}
                  correct="space"
                  onChange={setPrintChoice}
                />
                <aside className="theory-note">
                  По умолчанию <code>print</code> ставит пробел между значениями, разделёнными
                  запятыми.
                </aside>
                <LessonStatus
                  id="print"
                  completed={completedLessons.has("print")}
                  ready={printChoice === "space"}
                  onComplete={completeLesson}
                />
              </article>

              <article className="theory-lesson" id="theory-errors">
                <div className="theory-lesson-heading">
                  <span>04</span>
                  <div>
                    <p className="eyebrow">Спокойно, это нормально</p>
                    <h3>Ошибка объясняет, что произошло</h3>
                  </div>
                </div>
                <p>
                  Ошибка — не поражение, а сообщение Python. Начинайте читать его с последней
                  строки: там находится тип ошибки и короткое объяснение.
                </p>
                <div className="theory-error-example">
                  <div className="theory-code is-static">
                    <div><span>1</span><code>print(hello)</code></div>
                  </div>
                  <div className="theory-traceback">
                    <span>Traceback (most recent call last):</span>
                    <span>File &quot;main.py&quot;, line 1</span>
                    <strong>NameError: name &apos;hello&apos; is not defined</strong>
                  </div>
                </div>
                <ChoiceGroup
                  label="Что Python сообщает последней строкой?"
                  options={[
                    { value: "printer", label: "Команда print сломана" },
                    { value: "unknown", label: "Он не знает имени hello" },
                    { value: "internet", label: "Нет подключения к интернету" },
                  ]}
                  value={errorChoice}
                  correct="unknown"
                  onChange={setErrorChoice}
                />
                <aside className="theory-note is-accent">
                  Хотели вывести текст? Нужны кавычки: <code>print(&quot;hello&quot;)</code>.
                </aside>
                <LessonStatus
                  id="errors"
                  completed={completedLessons.has("errors")}
                  ready={errorChoice === "unknown"}
                  onComplete={completeLesson}
                />
              </article>

              <article className="theory-lesson" id="theory-indent">
                <div className="theory-lesson-heading">
                  <span>05</span>
                  <div>
                    <p className="eyebrow">Структура кода</p>
                    <h3>Отступ показывает принадлежность</h3>
                  </div>
                </div>
                <p>
                  В Python отступы имеют смысл. Команды с одинаковым отступом относятся к одному
                  блоку. После строки с двоеточием вложенный блок сдвигается вправо.
                </p>
                <div className="theory-compare-code">
                  <div>
                    <span className="compare-label is-right">Правильно</span>
                    <pre><code>{`if 5 > 3:
    print("Да")`}</code></pre>
                  </div>
                  <div>
                    <span className="compare-label is-wrong">Неправильно</span>
                    <pre><code>{`if 5 > 3:
print("Да")`}</code></pre>
                  </div>
                </div>
                <ChoiceGroup
                  label="Где должен стоять print после строки с двоеточием?"
                  options={[
                    { value: "left", label: "В самом начале строки" },
                    { value: "indent", label: "С отступом вправо" },
                    { value: "random", label: "В любом месте" },
                  ]}
                  value={indentChoice}
                  correct="indent"
                  onChange={setIndentChoice}
                />
                <LessonStatus
                  id="indent"
                  completed={completedLessons.has("indent")}
                  ready={indentChoice === "indent"}
                  onComplete={completeLesson}
                />
              </article>

              <section className={`theory-finish ${progress === 100 ? "is-ready" : ""}`}>
                <div className="theory-finish-planet">
                  <PlanetSphere progress={progress} variant={0} complete={progress === 100} />
                </div>
                <div>
                  <p className="eyebrow">{progress === 100 ? "Глава пройдена" : "Финиш близко"}</p>
                  <h3>{progress === 100 ? "Планета заполнена" : `Пройдено ${progress}%`}</h3>
                  <p>
                    {progress === 100
                      ? "Ракета уже переместилась к следующей планете. Старые вопросы будут возвращаться в будущих уровнях игры."
                      : "Завершите оставшиеся смысловые блоки — одного пролистывания для прогресса недостаточно."}
                  </p>
                  {progress === 100 ? (
                    <button onClick={replayChapter}>Повторить главу</button>
                  ) : (
                    <button onClick={() => scrollToFirstIncomplete()}>
                      К первому непройденному вопросу
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
