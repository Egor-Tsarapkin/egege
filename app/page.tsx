"use client";

import { useMemo, useRef, useState } from "react";

type Section = "home" | "tasks" | "variants" | "dashboard";
type Difficulty = "Базовый" | "Средний" | "Высокий";
type Activity = Record<string, number>;

type Task = {
  id: string;
  number: number;
  difficulty: Difficulty;
  source: string;
  title: string;
  body: React.ReactNode;
  answer: string;
  figure?: "network";
  file?: { name: string; href: string; meta: string };
};

type Variant = {
  id: string;
  title: string;
  description: string;
  taskIds: string[];
};

type Burst = {
  id: number;
  x: number;
  y: number;
};

const STORAGE_KEY = "egege-activity-v1";
const XP_PER_ANSWER = 10;

const tasks: Task[] = [
  {
    id: "1042",
    number: 1,
    difficulty: "Базовый",
    source: "Tsarapkin",
    title: "Кодирование сообщения",
    body: (
      <>
        Для букв <b>А, Б, В, Г</b> используется неравномерный двоичный код:
        А — 0, Б — 10, В — 110, Г — 111. Закодируйте слово <b>БАГАЖ</b>,
        если буква Ж передаётся кодом 101.
      </>
    ),
    answer: "1001110101",
  },
  {
    id: "2187",
    number: 4,
    difficulty: "Средний",
    source: "Авторская",
    title: "Кратчайший путь в сети",
    body: (
      <>
        Между пунктами проложены дороги с указанными длинами. Найдите длину
        кратчайшего пути из пункта <b>А</b> в пункт <b>Д</b>. Передвигаться
        можно только по показанным дорогам.
      </>
    ),
    answer: "9",
    figure: "network",
  },
  {
    id: "3315",
    number: 8,
    difficulty: "Средний",
    source: "Тренировочная",
    title: "Слова по алфавиту",
    body: (
      <>
        Все пятибуквенные слова, составленные из букв <b>К, О, Т</b>, записали
        в алфавитном порядке. Буквы в слове могут повторяться. Под каким номером
        находится слово <b>ТОКТО</b>? Нумерация начинается с единицы.
      </>
    ),
    answer: "197",
  },
  {
    id: "4720",
    number: 17,
    difficulty: "Высокий",
    source: "Авторская",
    title: "Пары чисел в последовательности",
    body: (
      <>
        В файле дана последовательность целых чисел. Определите количество пар
        соседних элементов, в которых ровно одно число двузначное, а сумма пары
        делится на 7. В ответе запишите найденное количество.
      </>
    ),
    answer: "8",
    file: {
      name: "17_sequence.txt",
      href: "/materials/17_sequence.txt",
      meta: "TXT · 55 Б",
    },
  },
  {
    id: "5926",
    number: 23,
    difficulty: "Высокий",
    source: "Тренировочная",
    title: "Исполнитель преобразует число",
    body: (
      <>
        Исполнитель умеет прибавлять 2 и умножать число на 3. Сколько существует
        программ, которые преобразуют число 1 в число 29, при этом траектория
        вычислений обязательно содержит число 9 и не содержит число 15?
      </>
    ),
    answer: "4",
  },
];

const variants: Variant[] = [
  {
    id: "01",
    title: "Разминка",
    description: "Три коротких задания из разных тем.",
    taskIds: ["1042", "2187", "3315"],
  },
  {
    id: "02",
    title: "Практика с файлами",
    description: "Два задания повышенной сложности.",
    taskIds: ["4720", "5926"],
  },
];

const burstParticles = [
  { x: -92, y: -104, r: -18, label: "XP" },
  { x: -55, y: -145, r: 12, label: "+10" },
  { x: -20, y: -112, r: -7, label: "•" },
  { x: 20, y: -160, r: 9, label: "XP" },
  { x: 54, y: -118, r: 18, label: "+10" },
  { x: 92, y: -88, r: -13, label: "•" },
  { x: -112, y: -58, r: 22, label: "•" },
  { x: 112, y: -45, r: -20, label: "XP" },
  { x: -70, y: -38, r: -10, label: "+10" },
  { x: 72, y: -24, r: 12, label: "•" },
];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DatabaseIcon() {
  return (
    <span className="dock-icon database-icon" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function VariantsIcon() {
  return (
    <span className="dock-icon variants-icon" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function DashboardIcon() {
  return (
    <span className="dock-icon dashboard-icon" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Dock({ navigate }: { navigate: (section: Section) => void }) {
  const dockRef = useRef<HTMLDivElement>(null);
  const dockFrame = useRef<number | null>(null);
  const [scales, setScales] = useState([1, 1, 1]);

  const reactToPointer = (clientX: number) => {
    if (dockFrame.current !== null || window.matchMedia("(hover: none)").matches) return;
    dockFrame.current = requestAnimationFrame(() => {
      dockFrame.current = null;
      const buttons = dockRef.current?.querySelectorAll<HTMLButtonElement>(".dock-item");
      if (!buttons) return;
      setScales(
        Array.from(buttons).map((button) => {
          const box = button.getBoundingClientRect();
          const distance = Math.abs(clientX - (box.left + box.width / 2));
          return 1 + Math.max(0, 1 - distance / 140) * 0.18;
        }),
      );
    });
  };

  const items: Array<{
    section: Section;
    label: string;
    icon: React.ReactNode;
  }> = [
    { section: "tasks", label: "База заданий", icon: <DatabaseIcon /> },
    { section: "variants", label: "Варианты", icon: <VariantsIcon /> },
    { section: "dashboard", label: "Дашборд", icon: <DashboardIcon /> },
  ];

  return (
    <div
      className="dock"
      ref={dockRef}
      onPointerMove={(event) => reactToPointer(event.clientX)}
      onPointerLeave={() => setScales([1, 1, 1])}
      aria-label="Основная навигация"
    >
      {items.map((item, index) => (
        <button
          className="dock-item"
          style={{ "--dock-scale": scales[index] } as React.CSSProperties}
          onClick={() => navigate(item.section)}
          key={item.section}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function AppHeader({
  section,
  navigate,
}: {
  section: Section;
  navigate: (section: Section) => void;
}) {
  return (
    <header className="topbar">
      <button className="wordmark" onClick={() => navigate("home")}>
        <span className="mini-mark">Е</span>
        <span className="wordmark-name"><b>EGE</b>GE</span>
        <small className="wordmark-by">by Tsarapkin</small>
      </button>
      <nav aria-label="Разделы">
        <button
          className={section === "tasks" ? "nav-active" : ""}
          onClick={() => navigate("tasks")}
        >
          База
        </button>
        <button
          className={section === "variants" ? "nav-active" : ""}
          onClick={() => navigate("variants")}
        >
          Варианты
        </button>
        <button
          className={section === "dashboard" ? "nav-active" : ""}
          onClick={() => navigate("dashboard")}
        >
          Дашборд
        </button>
      </nav>
    </header>
  );
}

function NetworkFigure() {
  return (
    <figure className="network-figure" aria-label="Схема дорог между пунктами">
      <div className="road r-ab"><span>4</span></div>
      <div className="road r-ac"><span>7</span></div>
      <div className="road r-bc"><span>2</span></div>
      <div className="road r-bd"><span>5</span></div>
      <div className="road r-cd"><span>4</span></div>
      <div className="point p-a">А</div>
      <div className="point p-b">Б</div>
      <div className="point p-c">В</div>
      <div className="point p-d">Д</div>
      <figcaption>Схема дорог</figcaption>
    </figure>
  );
}

function TaskItem({
  task,
  onCorrect,
  onIncorrect,
}: {
  task: Task;
  onCorrect: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onIncorrect: () => void;
}) {
  const [answerOpen, setAnswerOpen] = useState(false);

  return (
    <article className="task-item">
      <div className="task-meta">
        <span className="task-id">{task.id}</span>
        <span>№{task.number}</span>
        <span>{task.difficulty}</span>
        <span>{task.source}</span>
      </div>
      <h2>{task.title}</h2>
      <div className="task-body">{task.body}</div>
      {task.figure === "network" && <NetworkFigure />}
      {task.file && (
        <a className="file-link" href={task.file.href} download>
          <span className="file-icon" aria-hidden="true">↓</span>
          <span>
            <b>{task.file.name}</b>
            <small>{task.file.meta}</small>
          </span>
        </a>
      )}
      <button
        className={`answer-toggle ${answerOpen ? "is-open" : ""}`}
        onClick={() => setAnswerOpen((current) => !current)}
        aria-expanded={answerOpen}
      >
        {answerOpen ? "Скрыть ответ" : "Показать ответ"}
      </button>
      <div className={`answer-reveal ${answerOpen ? "is-open" : ""}`}>
        <div>
          <div className="answer-inner">
            <p className="answer-label">Ответ</p>
            <p className="answer-value">{task.answer}</p>
            <div className="match-row">
              <span>Ваш ответ совпал?</span>
              <button className="match-yes" onClick={onCorrect}>Да</button>
              <button onClick={onIncorrect}>Нет</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="tasks-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

function Dashboard({ activity }: { activity: Activity }) {
  const calendar = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - 111);
    const padding = (start.getDay() + 6) % 7;
    const days = Array.from({ length: 112 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dateKey(date);
      return { key, count: activity[key] ?? 0 };
    });
    return { days, padding };
  }, [activity]);

  const total = Object.values(activity).reduce((sum, count) => sum + count, 0);
  const activeDays = Object.values(activity).filter((count) => count > 0).length;
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  while ((activity[dateKey(cursor)] ?? 0) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return (
    <div className="dashboard-content">
      <section className="stats-grid" aria-label="Статистика">
        <article>
          <span>Правильных ответов</span>
          <strong>{total}</strong>
        </article>
        <article>
          <span>Накоплено</span>
          <strong>{total * XP_PER_ANSWER}<small> XP</small></strong>
        </article>
        <article>
          <span>Активных дней</span>
          <strong>{activeDays}</strong>
        </article>
        <article>
          <span>Серия</span>
          <strong>{streak}<small> дн.</small></strong>
        </article>
      </section>

      <section className="activity-card">
        <div className="activity-heading">
          <div>
            <h2>Активность</h2>
            <p>Каждая отметка «Да» добавляет один правильный ответ.</p>
          </div>
          <span>Последние 16 недель</span>
        </div>
        <div className="calendar-scroll">
          <div className="activity-grid" aria-label="Календарь активности">
            {Array.from({ length: calendar.padding }, (_, index) => (
              <i className="activity-day is-empty" key={`empty-${index}`} />
            ))}
            {calendar.days.map((day) => {
              const level =
                day.count === 0 ? 0 : day.count === 1 ? 1 : day.count < 4 ? 2 : day.count < 7 ? 3 : 4;
              return (
                <i
                  className={`activity-day level-${level}`}
                  title={`${day.key}: ${day.count}`}
                  aria-label={`${day.key}: ${day.count} правильных ответов`}
                  key={day.key}
                />
              );
            })}
          </div>
        </div>
        <div className="activity-legend" aria-hidden="true">
          <span>Меньше</span>
          {[0, 1, 2, 3, 4].map((level) => <i className={`level-${level}`} key={level} />)}
          <span>Больше</span>
        </div>
      </section>

      {total === 0 && (
        <section className="dashboard-note">
          <span>0 XP</span>
          <div>
            <h2>Начните с любого задания</h2>
            <p>Откройте ответ и нажмите «Да» — активность сразу появится здесь.</p>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Home() {
  const [section, setSection] = useState<Section>("home");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [source, setSource] = useState("all");
  const [openVariant, setOpenVariant] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Activity) : {};
    } catch {
      return {};
    }
  });
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstId = useRef(0);

  const navigate = (nextSection: Section) => {
    setSection(nextSection);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notify = (message: string) => {
    setToast("");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    requestAnimationFrame(() => setToast(message));
    toastTimer.current = setTimeout(() => setToast(""), 2500);
  };

  const addCorrectAnswer = (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextBurst = {
      id: ++burstId.current,
      x: event.clientX,
      y: event.clientY,
    };
    setBursts((current) => [...current, nextBurst]);
    window.setTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== nextBurst.id));
    }, 900);

    const key = dateKey(new Date());
    setActivity((current) => {
      const next = { ...current, [key]: (current[key] ?? 0) + 1 };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keep the in-memory dashboard working if storage is unavailable.
      }
      return next;
    });
    notify(`+${XP_PER_ANSWER} XP · записано в дашборд`);
  };

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const normalizedSearch = search.trim();
        return (
          (!normalizedSearch || task.id.includes(normalizedSearch)) &&
          (type === "all" || task.number === Number(type)) &&
          (difficulty === "all" || task.difficulty === difficulty) &&
          (source === "all" || task.source === source)
        );
      }),
    [search, type, difficulty, source],
  );

  const resetFilters = () => {
    setSearch("");
    setType("all");
    setDifficulty("all");
    setSource("all");
  };

  const taskProps = {
    onCorrect: addCorrectAnswer,
    onIncorrect: () => notify("Ответ отмечен — попробуйте ещё одно задание"),
  };

  if (section === "home") {
    return (
      <main className="home">
        <div className="home-content">
          <div className="brand-mark" aria-hidden="true">Е</div>
          <h1><span className="ege-part">EGE</span><span className="ge-part">GE</span></h1>
          <p className="brand-by">by Tsarapkin</p>
          <p className="eyebrow">ЕГЭ по информатике</p>
          <Dock navigate={navigate} />
        </div>
        <p className="home-note">Открытая база · без регистрации</p>
        <Toast message={toast} />
      </main>
    );
  }

  return (
    <main className="tasks-page">
      <AppHeader section={section} navigate={navigate} />

      <div className="tasks-shell">
        {section === "tasks" && (
          <>
            <PageHeading
              eyebrow="Подготовка к ЕГЭ"
              title="База заданий"
              description="Выберите тему — все подходящие задания появятся ниже."
            />

            <section className="filter-panel" aria-label="Фильтры заданий">
              <label className="search-field">
                <span>Поиск по ID</span>
                <div>
                  <i aria-hidden="true" />
                  <input
                    inputMode="numeric"
                    value={search}
                    onChange={(event) => setSearch(event.target.value.replace(/\D/g, ""))}
                    placeholder="Например, 1042"
                  />
                  {search && (
                    <button aria-label="Очистить поиск" onClick={() => setSearch("")}>×</button>
                  )}
                </div>
              </label>
              <label>
                <span>Номер задания</span>
                <select value={type} onChange={(event) => setType(event.target.value)}>
                  <option value="all">Все номера</option>
                  {Array.from({ length: 27 }, (_, index) => index + 1).map((number) => (
                    <option value={number} key={number}>№{number}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Сложность</span>
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  <option value="all">Любая</option>
                  <option>Базовый</option>
                  <option>Средний</option>
                  <option>Высокий</option>
                </select>
              </label>
              <label>
                <span>Источник</span>
                <select value={source} onChange={(event) => setSource(event.target.value)}>
                  <option value="all">Все источники</option>
                  <option>Tsarapkin</option>
                  <option>Авторская</option>
                  <option>Тренировочная</option>
                </select>
              </label>
              <button className="reset-button" onClick={resetFilters}>
                <span aria-hidden="true">↺</span> Сбросить
              </button>
            </section>

            <div className="results-bar">
              <span>Найдено: <b>{filteredTasks.length}</b></span>
              <i />
              <span>Показаны все задания</span>
            </div>

            <section className="task-list" aria-live="polite">
              {filteredTasks.length ? (
                filteredTasks.map((task) => (
                  <TaskItem task={task} key={task.id} {...taskProps} />
                ))
              ) : (
                <div className="empty-state">
                  <span>∅</span>
                  <h2>Ничего не найдено</h2>
                  <p>Попробуйте изменить фильтры или проверить ID.</p>
                  <button onClick={resetFilters}>Сбросить фильтры</button>
                </div>
              )}
            </section>
          </>
        )}

        {section === "variants" && (
          <>
            <PageHeading
              eyebrow="Тестовый режим"
              title="Варианты"
              description="Небольшие подборки заданий для быстрой тренировки."
            />
            <section className="variant-list" aria-label="Доступные варианты">
              {variants.map((variant) => {
                const isOpen = openVariant === variant.id;
                return (
                  <article className={`variant-card ${isOpen ? "is-open" : ""}`} key={variant.id}>
                    <div className="variant-number">{variant.id}</div>
                    <div className="variant-copy">
                      <h2>{variant.title}</h2>
                      <p>{variant.description}</p>
                    </div>
                    <span className="variant-count">{variant.taskIds.length} задания</span>
                    <button onClick={() => setOpenVariant(isOpen ? null : variant.id)}>
                      {isOpen ? "Свернуть" : "Открыть"}
                    </button>
                  </article>
                );
              })}
            </section>

            {openVariant && (
              <section className="variant-run">
                <div className="variant-run-heading">
                  <span>Вариант {openVariant}</span>
                  <p>Ответы можно смотреть в любом порядке.</p>
                </div>
                {variants
                  .find((variant) => variant.id === openVariant)
                  ?.taskIds.map((taskId) => {
                    const task = tasks.find((item) => item.id === taskId);
                    return task ? <TaskItem task={task} key={task.id} {...taskProps} /> : null;
                  })}
              </section>
            )}
          </>
        )}

        {section === "dashboard" && (
          <>
            <PageHeading
              eyebrow="Прогресс на этом устройстве"
              title="Дашборд"
              description="Пока без аккаунта: статистика хранится только в этом браузере."
            />
            <Dashboard activity={activity} />
          </>
        )}
      </div>

      <footer>
        <button className="wordmark footer-wordmark" onClick={() => navigate("home")}>
          <span className="wordmark-name"><b>EGE</b>GE</span>
        </button>
        <span>by Tsarapkin · открытая база заданий</span>
      </footer>

      <Toast message={toast} />
      <div className="xp-layer" aria-hidden="true">
        {bursts.map((burst) => (
          <div
            className="xp-burst"
            style={{ left: burst.x, top: burst.y }}
            key={burst.id}
          >
            <strong>+{XP_PER_ANSWER} XP</strong>
            {burstParticles.map((particle, index) => (
              <i
                className={particle.label === "•" ? "xp-spark" : "xp-token"}
                style={{
                  "--xp-x": `${particle.x}px`,
                  "--xp-y": `${particle.y}px`,
                  "--xp-r": `${particle.r}deg`,
                  "--xp-delay": `${index * 12}ms`,
                } as React.CSSProperties}
                key={index}
              >
                {particle.label}
              </i>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className={`toast ${message ? "is-visible" : ""}`} role="status">
      <span className="toast-dot" />
      {message}
    </div>
  );
}
