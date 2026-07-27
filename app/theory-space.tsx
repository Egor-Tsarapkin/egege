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
    chapter: "Глава 1",
    title: "Как думает компьютер",
    description: "Точные инструкции, порядок команд и переменные.",
  },
  {
    id: 1,
    chapter: "Глава 2",
    title: "Условия и логика",
    description: "Как код принимает решения и выбирает маршрут.",
  },
  {
    id: 2,
    chapter: "Глава 3",
    title: "Циклы и повторения",
    description: "Как поручить программе повторяющуюся работу.",
  },
];

const lessonIds = ["program", "variables"] as const;
type LessonId = (typeof lessonIds)[number];

const lessonTitles: Record<LessonId, string> = {
  program: "Как работает программа",
  variables: "Переменные: коробки с именами",
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

function MascotRocket() {
  return (
    <span className="theory-rocket-orbit" aria-hidden="true">
      <span className="theory-rocket-path">
        <span className="theory-rocket">
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
      </span>
    </span>
  );
}

function EditorFrame({
  children,
  file = "main.py",
  className = "",
}: {
  children: React.ReactNode;
  file?: string;
  className?: string;
}) {
  return (
    <div className={`theory-editor ${className}`}>
      <div className="theory-editor-bar" aria-hidden="true">
        <span>
          <i />
          <i />
          <i />
        </span>
        <small>{file}</small>
        <b>Python</b>
      </div>
      {children}
    </div>
  );
}

function LessonStatus({
  id,
  completed,
  onComplete,
}: {
  id: LessonId;
  completed: boolean;
  onComplete: (id: LessonId) => void;
}) {
  return (
    <button
      className={`theory-complete-button ${completed ? "is-complete" : ""}`}
      disabled={completed}
      onClick={() => onComplete(id)}
    >
      <span aria-hidden="true">{completed ? "✓" : "→"}</span>
      {completed
        ? "Блок пройден"
        : id === "program"
          ? "Завершить блок · заполнить планету на 50%"
          : "Завершить главу"}
    </button>
  );
}

function LiteralAssistantGraphic() {
  return (
    <div className="literal-comic" aria-label="Компьютер выполняет инструкцию буквально">
      <div className="literal-panel literal-request">
        <div className="comic-person" aria-hidden="true">
          <i />
          <span />
        </div>
        <div className="comic-list">
          <small>Инструкция</small>
          <strong>Купи хлеб</strong>
          <span>Если есть яйца — возьми десяток</span>
        </div>
        <div className="comic-robot is-listening" aria-hidden="true">
          <i className="robot-antenna" />
          <span className="robot-head"><i /><i /></span>
          <span className="robot-body" />
        </div>
      </div>

      <div className="literal-panel literal-store">
        <div className="bread-shelf" aria-hidden="true">
          <span className="bread-kind bread-round" />
          <span className="bread-kind bread-loaf" />
          <small>Хлеб №1</small>
          <small>Хлеб №2</small>
        </div>
        <div className="comic-robot is-confused" aria-hidden="true">
          <i className="robot-antenna" />
          <span className="robot-head"><i /><i /></span>
          <span className="robot-body" />
        </div>
        <span className="robot-question" aria-hidden="true">?</span>
        <strong className="robot-stuck">ЗАВИС</strong>
      </div>

      <p>
        Компьютер выполняет всё буквально.
        <strong> Ему нужна чёткая инструкция.</strong>
      </p>
    </div>
  );
}

const taskParts = [
  { label: "Условие", className: "part-condition" },
  { label: "Символ", className: "part-symbol" },
  { label: "Счётчик", className: "part-counter" },
  { label: "Максимум", className: "part-maximum" },
  { label: "Остаток", className: "part-remainder" },
];

function TaskConstructorGraphic() {
  const crates = [
    ["part-condition", "part-counter", "part-maximum"],
    ["part-symbol", "part-counter", "part-condition"],
    ["part-remainder", "part-maximum", "part-symbol"],
  ];

  return (
    <div className="task-constructor" aria-label="Большие задачи собираются из маленьких подзадач">
      <header>
        <div>
          <small>Конечный набор деталей</small>
          <strong>Маленькие подзадачи</strong>
        </div>
        <span>Учим детали → решаем всё</span>
      </header>

      <div className="task-parts-bank">
        {taskParts.map((part) => (
          <span className={part.className} key={part.label}>{part.label}</span>
        ))}
      </div>

      <div className="task-conveyor">
        <span className="conveyor-line" aria-hidden="true" />
        {crates.map((parts, crateIndex) => (
          <div
            className={`task-crate task-crate-${crateIndex + 1}`}
            key={crateIndex}
            aria-hidden="true"
          >
            <small>Задача №{crateIndex + 1}</small>
            <div>
              {parts.map((part, partIndex) => (
                <i className={part} key={`${part}-${partIndex}`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p>Набор деталей ограничен, а задач, которые можно из них собрать, — очень много.</p>
    </div>
  );
}

function ProgramExample() {
  return (
    <div className="program-example">
      <EditorFrame className="program-reading-editor">
        <div className="theory-code is-static">
          {["x = 10", "y = 5", "print(x + y)"].map((line, index) => (
            <div className={`program-line program-line-${index + 1}`} key={line}>
              <span>{index + 1}</span>
              <code>{line}</code>
              <i>{index === 2 ? "15" : "✓"}</i>
            </div>
          ))}
        </div>
      </EditorFrame>
      <div className="program-direction" aria-hidden="true">
        <span>Старт</span>
        <i />
        <strong>сверху вниз</strong>
      </div>
    </div>
  );
}

function LifeBoxGraphic() {
  return (
    <div className="life-box-graphic" aria-label="Коробка с яблоком и ярлыком яблоко">
      <div className="life-box-copy">
        <small>Обычная жизнь</small>
        <strong>Кладём значение внутрь</strong>
        <p>Наклейка помогает потом обратиться к нужной коробке по имени.</p>
      </div>
      <div className="cardboard-scene" aria-hidden="true">
        <span className="css-apple"><i /></span>
        <span className="cardboard-box">
          <i className="box-flap box-flap-left" />
          <i className="box-flap box-flap-right" />
          <strong>яблоко</strong>
        </span>
      </div>
    </div>
  );
}

function AssignmentGraphic() {
  return (
    <div className="assignment-graphic" aria-label="x равно 5 означает положить значение 5 в переменную x">
      <div className="assignment-code">
        <code><strong>x</strong> = <b>5</b></code>
        <small>читаем справа налево</small>
      </div>
      <div className="assignment-motion" aria-hidden="true">
        <span className="assignment-value">5</span>
        <i className="assignment-arrow" />
        <span className="variable-box"><small>имя</small><strong>x</strong><b>5</b></span>
      </div>
      <p><strong>=</strong> — оператор присваивания: «положи значение справа в переменную слева».</p>
    </div>
  );
}

function EqualityGraphic() {
  return (
    <div className="equality-graphic">
      <div className="equality-card is-assign">
        <span>=</span>
        <div>
          <small>Присваивание</small>
          <strong>Положи</strong>
          <code>x = 5</code>
        </div>
      </div>
      <div className="equality-card is-compare">
        <span>==</span>
        <div>
          <small>Проверка</small>
          <strong>Равно?</strong>
          <code>x == 5</code>
        </div>
      </div>
    </div>
  );
}

const dataTypes = [
  { type: "int", name: "Целое число", example: "x = 10", value: "10" },
  { type: "float", name: "Дробь", example: "y = 3.14", value: "3.14" },
  { type: "str", name: "Строка", example: 'name = "Катя"', value: '"Катя"' },
  { type: "bool", name: "Логика", example: "flag = True", value: "True" },
];

function DataTypesTable() {
  return (
    <div className="data-types-table" role="table" aria-label="Основные типы данных Python">
      <div className="data-type-row is-heading" role="row">
        <span role="columnheader">Тип</span>
        <span role="columnheader">Пример</span>
        <span role="columnheader">Значение</span>
      </div>
      {dataTypes.map((item) => (
        <div className="data-type-row" role="row" key={item.type}>
          <span role="cell"><i>{item.type}</i><small>{item.name}</small></span>
          <code role="cell">{item.example}</code>
          <strong role="cell">{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function TypeDifferenceGraphic() {
  return (
    <div className="type-difference">
      <div className="type-difference-cells">
        <div>
          <small>Число</small>
          <code>x = <strong>5</strong></code>
          <span>int</span>
          <p>Можно складывать и умножать как число.</p>
        </div>
        <div>
          <small>Строка</small>
          <code>y = <strong>&quot;5&quot;</strong></code>
          <span>str</span>
          <p>Это один текстовый символ в кавычках.</p>
        </div>
      </div>
      <div className="same-screen">
        <span>На экране</span>
        <code>5&nbsp;&nbsp;&nbsp;5</code>
        <strong>Выглядят одинаково — ведут себя по-разному</strong>
      </div>
    </div>
  );
}

export default function TheorySpace({ userId }: TheorySpaceProps) {
  const storageKey = `egege-theory-progress-v2:${userId}`;
  const [selectedPlanet, setSelectedPlanet] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<LessonId>>(() => new Set());

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

  const progress = completedLessons.size * 50;
  const activePlanet = useMemo(
    () => planets.find((planet) => planet.id === selectedPlanet) ?? null,
    [selectedPlanet],
  );

  const goToLesson = (lessonId: LessonId, delay = 0) => {
    window.setTimeout(() => {
      document.getElementById(`theory-${lessonId}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, delay);
  };

  const completeLesson = (id: LessonId) => {
    const updated = new Set(completedLessons);
    updated.add(id);
    setCompletedLessons(updated);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(updated)));
    } catch {
      // Progress remains available for the current session.
    }

    if (id === "program") {
      goToLesson("variables", 160);
    } else {
      window.setTimeout(() => {
        document.getElementById("theory-finish")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "center",
        });
      }, 160);
    }
  };

  const replayChapter = () => {
    setCompletedLessons(new Set());
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // The in-memory reset still works.
    }
    document.getElementById("theory-intro")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToFirstIncomplete = (completed = completedLessons) => {
    const firstIncomplete = lessonIds.find((lessonId) => !completed.has(lessonId));
    if (firstIncomplete) goToLesson(firstIncomplete, 360);
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
                <span className="theory-planet-visual">
                  <PlanetSphere
                    progress={planetProgress}
                    variant={planet.id}
                    complete={planetProgress === 100}
                  />
                  {((progress < 100 && planet.id === 0) ||
                    (progress === 100 && planet.id === 1)) && <MascotRocket />}
                </span>
                <span className="theory-planet-label">
                  <small>{planet.chapter}</small>
                  <strong>{planet.title}</strong>
                  <i>{isCurrent ? `${progress}%` : "Скоро"}</i>
                </span>
              </button>
            );
          })}
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
              <span><i style={{ width: `${activePlanet.id === 0 ? progress : 0}%` }} /></span>
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
              <small>Её можно будет открыть сразу — строгой блокировки по порядку не будет.</small>
            </div>
          ) : (
            <div className="theory-document theory-chapter-one">
              <div className="theory-document-title">
                <p className="eyebrow">Глава 1 · Основы</p>
                <h2>Как думает компьютер и что такое переменные</h2>
                <p>
                  Сначала разберёмся, почему компьютеру нужны точные инструкции. Затем научим его
                  хранить значения под понятными именами.
                </p>
                <div className="theory-document-meta">
                  <span>Предисловие + 2 блока</span>
                  <span>≈ 18 минут</span>
                  <span>{completedLessons.size}/2 пройдено</span>
                </div>
              </div>

              <nav className="theory-document-nav" aria-label="Содержание главы">
                <button onClick={() => document.getElementById("theory-intro")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })}>
                  <span>0</span>
                  Предисловие
                </button>
                {lessonIds.map((lessonId, index) => (
                  <button onClick={() => goToLesson(lessonId)} key={lessonId}>
                    <span>{completedLessons.has(lessonId) ? "✓" : index + 1}</span>
                    {lessonTitles[lessonId]}
                  </button>
                ))}
              </nav>

              <section className="theory-intro chapter-one-intro" id="theory-intro">
                <div className="theory-section-heading">
                  <span>00</span>
                  <div>
                    <p className="eyebrow">Предисловие · прогресс пока не начисляется</p>
                    <h3>Компьютер — твой буквальный помощник</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Представь, что у тебя есть помощник. Он не понимает ни намёков, ни эмоций, ни
                    интонации. Он делает только то, что ты скажешь — <strong>буквально</strong>.
                  </p>
                  <p>
                    Ты говоришь ему: «Сходи в магазин и купи хлеб, если есть яйца — возьми
                    десяток». Он всё сделает, но только если ты точно объяснил, что значит «если
                    есть» и куда идти. Если в магазине два вида хлеба — он зависнет. Если ты не
                    сказал, где деньги, — уйдёт с пустыми руками.
                  </p>
                  <p>
                    Так вот — это и есть программирование. А этот помощник — и есть компьютер.
                  </p>
                </div>

                <LiteralAssistantGraphic />

                <div className="computer-strengths">
                  <p>Он очень тупой, но зато:</p>
                  <div>
                    <span><i>01</i>никогда не забывает</span>
                    <span><i>02</i>не ошибается сам</span>
                    <span><i>03</i>выполняет инструкции со скоростью света</span>
                  </div>
                  <strong>Твоя задача — научиться разговаривать с ним на понятном ему языке.</strong>
                </div>

                <div className="theory-subsection">
                  <p className="eyebrow">Особенности заданий на ЕГЭ</p>
                  <h4>Большая задача — комбинация маленьких подзадач</h4>
                  <p>
                    Почти все задачи на ЕГЭ собираются из небольших действий, которые повторяются
                    снова и снова в разных сочетаниях:
                  </p>
                  <ul className="subtask-list">
                    <li>проверить, делится ли число на 3 и 5;</li>
                    <li>найти последний символ строки;</li>
                    <li>посчитать количество подходящих чисел;</li>
                    <li>найти максимум или минимум среди значений.</li>
                  </ul>
                  <p>
                    Ты не учишь задачи наизусть. Ты учишься собирать решение как из конструктора —
                    из деталей, которые уже знаешь как решать.
                  </p>
                </div>

                <TaskConstructorGraphic />

                <aside className="theory-intro-insight">
                  Если ты знаешь, как решать маленькие задачи, которых не так много, то сможешь
                  решить бесчисленное количество больших задач, которые из них состоят.
                </aside>

                <div className="learning-outcomes">
                  <p className="eyebrow">В этой главе ты выучишь</p>
                  <div>
                    <span><i>1</i>как называются разные действия;</span>
                    <span><i>2</i>как они записываются в коде — это синтаксис;</span>
                    <span><i>3</i>как собирать действия в правильном порядке.</span>
                  </div>
                  <strong>
                    Если ты поймёшь эти принципы, то сможешь решить даже новую задачу.
                  </strong>
                </div>

                <button className="theory-start-button" onClick={() => goToLesson("program")}>
                  Перейти к первому блоку
                  <span aria-hidden="true">↓</span>
                </button>
              </section>

              <article className="theory-lesson chapter-one-block" id="theory-program">
                <div className="theory-lesson-heading">
                  <span>01</span>
                  <div>
                    <p className="eyebrow">Как работает программа</p>
                    <h3>Строго по порядку — сверху вниз</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Когда ты запускаешь программу, она выполняет команды строго по порядку. Одна
                    за другой. Без догадок, без логики, без «ну ты понял».
                  </p>
                  <p>
                    Компьютер не умеет додумать — он ждёт точную пошаговую инструкцию. Если
                    перепутать команды, забыть важный шаг или сделать опечатку, программа не
                    сработает либо даст не тот результат, который ты ожидал.
                  </p>
                </div>

                <blockquote className="theory-statement">
                  Программирование — это не про «умение писать код», а про умение чётко объяснить,
                  что ты хочешь.
                </blockquote>

                <ProgramExample />

                <div className="example-explanation">
                  <p>
                    Не пугайся: всё, что используется в примере, мы подробно разберём дальше.
                    Но интуитивно уже видно, что программа выведет <strong>15</strong>.
                  </p>
                  <p>
                    Пока просто знай: <code>x</code> и <code>y</code> — это переменные. Они хранят
                    значения, и с ними можно работать.
                  </p>
                </div>

                <LessonStatus
                  id="program"
                  completed={completedLessons.has("program")}
                  onComplete={completeLesson}
                />
              </article>

              <article className="theory-lesson chapter-one-block" id="theory-variables">
                <div className="theory-lesson-heading">
                  <span>02</span>
                  <div>
                    <p className="eyebrow">Переменные</p>
                    <h3>Коробки с именами</h3>
                  </div>
                </div>

                <div className="theory-prose">
                  <p>
                    Представь коробку, в которую ты кладёшь яблоко. На коробку наклеиваешь стикер
                    «яблоко». Теперь нужную коробку легко найти по имени.
                  </p>
                </div>

                <LifeBoxGraphic />

                <div className="theory-prose">
                  <p>
                    В программировании похожую роль выполняют переменные. Переменная — это
                    <strong> имя, связанное с некоторым значением</strong>. Образ коробки удобен
                    для начала, хотя технически Python хранит значение в памяти, а имя позволяет
                    к нему обратиться.
                  </p>
                  <p>
                    В переменной можно хранить число, текст, логическое значение и даже целый
                    список.
                  </p>
                </div>

                <AssignmentGraphic />

                <div className="theory-subsection">
                  <p className="eyebrow">Знак равенства</p>
                  <h4><code>=</code> — это команда, а не проверка</h4>
                  <p>
                    В математике знак равенства говорит, что левая и правая части равны. В Python
                    один знак <code>=</code> означает присваивание: «пусть <code>x</code> теперь
                    связано со значением <code>5</code>».
                  </p>
                </div>

                <EqualityGraphic />

                <p className="theory-footnote">
                  Проверка на равенство записывается как <code>x == 5</code>. К ней вернёмся в
                  главе про условия.
                </p>

                <div className="theory-subsection">
                  <p className="eyebrow">Что можно хранить</p>
                  <h4>Основные типы данных Python</h4>
                  <p>
                    Тип определяет, что именно лежит в переменной и какие действия с этим значением
                    разрешены.
                  </p>
                </div>

                <DataTypesTable />

                <div className="data-types-notes">
                  <p><i>str</i> Строки всегда записываются в одинарных или двойных кавычках.</p>
                  <p><i>bool</i> Значения <code>True</code> и <code>False</code> начинаются с заглавной буквы.</p>
                </div>

                <div className="theory-subsection">
                  <p className="eyebrow">Важное различие</p>
                  <h4>Одинаковый вид — разные значения для компьютера</h4>
                  <p>
                    Число <code>5</code> и строка <code>&quot;5&quot;</code> выглядят похоже, но
                    Python воспринимает их совершенно по-разному.
                  </p>
                </div>

                <TypeDifferenceGraphic />

                <div className="print-note">
                  <code>print(...)</code>
                  <p>
                    В примерах мы используем <strong>print</strong>, чтобы вывести значение на
                    экран. Как устроены функции, разберём позже; пока достаточно знать, что
                    <code> print</code> показывает результат.
                  </p>
                </div>

                <aside className="theory-warning">
                  <span>Запомни сейчас</span>
                  <p>
                    Тип данных очень важен. От него зависит, как ты сможешь взаимодействовать с
                    переменной. В задачах ты ещё много раз встретишь разницу между
                    <code> int</code> и <code> str</code>.
                  </p>
                </aside>

                <LessonStatus
                  id="variables"
                  completed={completedLessons.has("variables")}
                  onComplete={completeLesson}
                />
              </article>

              <section
                className={`theory-finish ${progress === 100 ? "is-ready" : ""}`}
                id="theory-finish"
              >
                <div className="theory-finish-planet">
                  <PlanetSphere progress={progress} variant={0} complete={progress === 100} />
                </div>
                <div>
                  <p className="eyebrow">{progress === 100 ? "Глава пройдена" : "Остался один блок"}</p>
                  <h3>{progress === 100 ? "Планета заполнена" : `Пройдено ${progress}%`}</h3>
                  <p>
                    {progress === 100
                      ? "Теперь ты знаешь, как компьютер выполняет программу и зачем нужны переменные."
                      : "Заверши второй блок, чтобы полностью заполнить планету."}
                  </p>
                  {progress === 100 ? (
                    <button onClick={replayChapter}>Повторить главу</button>
                  ) : (
                    <button onClick={() => scrollToFirstIncomplete()}>
                      К непройденному блоку
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
