"use client";

import { useMemo, useRef, useState } from "react";

type Section = "home" | "tasks";
type Difficulty = "Базовый" | "Средний" | "Высокий";

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

const tasks: Task[] = [
  {
    id: "TS-1042",
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
    id: "TS-2187",
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
    id: "TS-3315",
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
    id: "TS-4720",
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
    id: "TS-5926",
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

function Dock({
  openTasks,
  notify,
}: {
  openTasks: () => void;
  notify: () => void;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  const [scales, setScales] = useState([1, 1, 1]);

  const reactToPointer = (clientX: number) => {
    const buttons = dockRef.current?.querySelectorAll<HTMLButtonElement>(".dock-item");
    if (!buttons) return;
    setScales(
      Array.from(buttons).map((button) => {
        const box = button.getBoundingClientRect();
        const distance = Math.abs(clientX - (box.left + box.width / 2));
        return 1 + Math.max(0, 1 - distance / 130) * 0.22;
      }),
    );
  };

  return (
    <div
      className="dock"
      ref={dockRef}
      onPointerMove={(event) => reactToPointer(event.clientX)}
      onPointerLeave={() => setScales([1, 1, 1])}
      aria-label="Основная навигация"
    >
      <button
        className="dock-item"
        style={{ "--dock-scale": scales[0] } as React.CSSProperties}
        onClick={openTasks}
      >
        <DatabaseIcon />
        <span>База заданий</span>
      </button>
      <button
        className="dock-item"
        style={{ "--dock-scale": scales[1] } as React.CSSProperties}
        onClick={notify}
      >
        <VariantsIcon />
        <span>Варианты</span>
        <small>Скоро</small>
      </button>
      <button
        className="dock-item"
        style={{ "--dock-scale": scales[2] } as React.CSSProperties}
        onClick={notify}
      >
        <DashboardIcon />
        <span>Дашборд</span>
        <small>Скоро</small>
      </button>
    </div>
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
  notify,
}: {
  task: Task;
  notify: () => void;
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
        <span aria-hidden="true">↗</span>
      </button>
      <div className={`answer-reveal ${answerOpen ? "is-open" : ""}`}>
        <div>
          <div className="answer-inner">
            <p className="answer-label">Ответ</p>
            <p className="answer-value">{task.answer}</p>
            <div className="match-row">
              <span>Ваш ответ совпал?</span>
              <button onClick={notify}>Да</button>
              <button onClick={notify}>Нет</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [section, setSection] = useState<Section>("home");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [source, setSource] = useState("all");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = (message: string) => {
    setToast("");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    requestAnimationFrame(() => setToast(message));
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const normalizedSearch = search.trim().toLowerCase();
        return (
          (!normalizedSearch || task.id.toLowerCase().includes(normalizedSearch)) &&
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

  if (section === "home") {
    return (
      <main className="home">
        <div className="home-content">
          <div className="brand-mark" aria-hidden="true">T</div>
          <h1>Tsarapkin<span>.</span></h1>
          <p className="eyebrow">ЕГЭ по информатике</p>
          <Dock
            openTasks={() => setSection("tasks")}
            notify={() => notify("Раздел скоро появится")}
          />
        </div>
        <p className="home-note">Открытая база · без регистрации</p>
        <div className={`toast ${toast ? "is-visible" : ""}`} role="status">
          <span className="toast-dot" />
          {toast}
        </div>
      </main>
    );
  }

  return (
    <main className="tasks-page">
      <header className="topbar">
        <button className="wordmark" onClick={() => setSection("home")}>
          <span className="mini-mark">T</span>
          Tsarapkin<span>.</span>
        </button>
        <nav aria-label="Разделы">
          <button className="nav-active">База заданий</button>
          <button aria-label="Варианты" onClick={() => notify("Раздел скоро появится")}>Варианты <small>Скоро</small></button>
          <button aria-label="Дашборд" onClick={() => notify("Раздел скоро появится")}>Дашборд <small>Скоро</small></button>
        </nav>
      </header>

      <div className="tasks-shell">
        <section className="tasks-heading">
          <p className="eyebrow">Подготовка к ЕГЭ</p>
          <h1>База заданий</h1>
          <p>Выберите тему — все подходящие задания появятся ниже.</p>
        </section>

        <section className="filter-panel" aria-label="Фильтры заданий">
          <label className="search-field">
            <span>Поиск по ID</span>
            <div>
              <i aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Например, TS-1042"
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
              <TaskItem
                task={task}
                key={task.id}
                notify={() => notify("Статистика появится после запуска дашборда")}
              />
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
      </div>

      <footer>
        <button className="wordmark footer-wordmark" onClick={() => setSection("home")}>
          Tsarapkin<span>.</span>
        </button>
        <span>Открытая база заданий</span>
      </footer>

      <div className={`toast ${toast ? "is-visible" : ""}`} role="status">
        <span className="toast-dot" />
        {toast}
      </div>
    </main>
  );
}
