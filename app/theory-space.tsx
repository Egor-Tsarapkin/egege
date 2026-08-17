"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TheorySpaceProps = {
  accessToken: string;
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
    title: "Переменные, типы данных, арифметические операции",
    description: "Как хранить данные и выполнять вычисления в Python.",
  },
  {
    id: 1,
    chapter: "Глава 2",
    title: "Условные конструкции",
    description: "Как программа принимает решения с помощью if и else.",
  },
  {
    id: 2,
    chapter: "Глава 3",
    title: "Цикл while",
    description: "Повторение команд и знакомство с elif.",
  },
  {
    id: 3,
    chapter: "Глава 4",
    title: "Списки",
    description: "Как хранить и изменять наборы значений.",
  },
  {
    id: 4,
    chapter: "Глава 5",
    title: "Строки",
    description: "Как работать с текстом, индексами и срезами.",
  },
  {
    id: 5,
    chapter: "Глава 6",
    title: "Цикл for",
    description: "Как перебирать элементы и заранее известные диапазоны.",
  },
  {
    id: 6,
    chapter: "Глава 7",
    title: "Свои функции",
    description: "Как создавать собственные команды и переиспользовать код.",
  },
  {
    id: 7,
    chapter: "Глава 8",
    title: "Генераторы списков",
    description: "Как создавать списки короткой и выразительной записью.",
  },
  {
    id: 8,
    chapter: "Глава 9",
    title: "Работа с файлами и импорты",
    description: "Как читать файлы и подключать готовые инструменты.",
  },
];

const lessonIds = ["program", "variables"] as const;
type LessonId = (typeof lessonIds)[number];

const lessonTitles: Record<LessonId, string> = {
  program: "Как работает программа",
  variables: "Переменные: коробки с именами",
};

const arithmeticLessonIds = ["basics", "division", "strings", "shortcuts"] as const;
type ArithmeticLessonId = (typeof arithmeticLessonIds)[number];

const arithmeticLessonTitles: Record<ArithmeticLessonId, string> = {
  basics: "Операции с числами",
  division: "Деление, // и %",
  strings: "Строки и разные типы",
  shortcuts: "Короткая запись",
};

const conditionLessonIds = ["branches", "chains", "indentation", "logic", "contains"] as const;
type ConditionLessonId = (typeof conditionLessonIds)[number];

const conditionLessonTitles: Record<ConditionLessonId, string> = {
  branches: "if, else и elif",
  chains: "Несколько if или одна цепочка",
  indentation: "Отступы и границы блока",
  logic: "Сравнения и логика",
  contains: "Оператор in и частые ошибки",
};

const stringTheoryLessonIds = ["indexing", "negative", "slices", "step"] as const;
type StringTheoryLessonId = (typeof stringTheoryLessonIds)[number];

const stringTheoryLessonTitles: Record<StringTheoryLessonId, string> = {
  indexing: "Строка и положительные индексы",
  negative: "Отсчёт с конца",
  slices: "Границы среза",
  step: "Шаг и полезные сокращения",
};

const whileTheoryLessonIds = ["idea", "trace", "indentation", "infinite"] as const;
type WhileTheoryLessonId = (typeof whileTheoryLessonIds)[number];

const whileTheoryLessonTitles: Record<WhileTheoryLessonId, string> = {
  idea: "Как устроен while",
  trace: "Итерации шаг за шагом",
  indentation: "Что повторяется, а что нет",
  infinite: "Как остановить цикл",
};

const forTheoryLessonIds = ["iteration", "range", "step", "comparison"] as const;
type ForTheoryLessonId = (typeof forTheoryLessonIds)[number];

const forTheoryLessonTitles: Record<ForTheoryLessonId, string> = {
  iteration: "Перебор элементов",
  range: "Как устроен range",
  step: "От, до и шаг",
  comparison: "for или while",
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
      {variant === 0 && <span className="planet-basics-pattern"><i>x</i><i>=</i><i>5</i><i>+</i></span>}
      {variant === 1 && (
        <span className="planet-logic-pattern">
          <i />
          <i />
          <i />
        </span>
      )}
      {variant === 2 && (
        <span className="planet-loop-pattern">
          <i>while</i>
          <i>↻</i>
          <i>?</i>
        </span>
      )}
      {variant === 3 && (
        <span className="planet-list-pattern">
          <i>[</i><i>1</i><i>2</i><i>3</i><i>]</i>
        </span>
      )}
      {variant === 4 && (
        <span className="planet-string-pattern">
          <i>&quot;</i>
          <i>0</i>
          <i>:</i>
          <i>−1</i>
        </span>
      )}
      {variant === 5 && (
        <span className="planet-for-pattern">
          <i>for</i>
          <i>→</i>
          <i>range</i>
        </span>
      )}
      {variant === 6 && (
        <span className="planet-function-pattern">
          <i>def</i><i>f()</i><i>↳</i>
        </span>
      )}
      {variant === 7 && (
        <span className="planet-generator-pattern">
          <i>[</i><i>x</i><i>for</i><i>]</i>
        </span>
      )}
      {variant === 8 && (
        <span className="planet-file-pattern">
          <i>PY</i><i>↗</i><i>TXT</i>
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

const pythonKeywords = new Set([
  "and", "elif", "else", "False", "for", "if", "in", "None", "not", "or", "True", "while",
]);

function TheoryPythonCode({ code }: { code: string }) {
  const [scale, setScale] = useState(1);
  const tokens = code.split(/(#[^\n]*|"[^"\n]*"|'[^'\n]*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g);

  return (
    <section className="marathon-code theory-test-code">
      <div className="marathon-code-bar">
        <span><i /><i /><i /> Python</span>
        <div>
          <button type="button" onClick={() => setScale((value) => Math.max(0.78, value - 0.1))} aria-label="Уменьшить код">−</button>
          <span>{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((value) => Math.min(1.42, value + 0.1))} aria-label="Увеличить код">+</button>
        </div>
      </div>
      <pre style={{ fontSize: `${scale}rem` }}><code>{tokens.map((token, index) => {
        let className = "";
        if (/^#/.test(token)) className = "tok-comment";
        else if (/^["']/.test(token)) className = "tok-string";
        else if (/^\d/.test(token)) className = "tok-number";
        else if (pythonKeywords.has(token)) className = "tok-keyword";
        else if (["print", "input", "int", "float", "str", "bool", "range", "len"].includes(token)) className = "tok-built-in";
        return <span className={className} key={`${index}-${token}`}>{token}</span>;
      })}</code></pre>
    </section>
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
          ? "Завершить блок"
          : "Завершить главу"}
    </button>
  );
}

function ArithmeticLessonStatus({
  id,
  completed,
  onComplete,
}: {
  id: ArithmeticLessonId;
  completed: boolean;
  onComplete: (id: ArithmeticLessonId) => void;
}) {
  return (
    <button
      className={`theory-complete-button ${completed ? "is-complete" : ""}`}
      disabled={completed}
      onClick={() => onComplete(id)}
    >
      <span aria-hidden="true">{completed ? "✓" : "→"}</span>
      {completed ? "Блок пройден" : id === "shortcuts" ? "Завершить главу" : "Завершить блок"}
    </button>
  );
}

function ConditionLessonStatus({
  id,
  completed,
  onComplete,
}: {
  id: ConditionLessonId;
  completed: boolean;
  onComplete: (id: ConditionLessonId) => void;
}) {
  return (
    <button
      className={`theory-complete-button ${completed ? "is-complete" : ""}`}
      disabled={completed}
      onClick={() => onComplete(id)}
    >
      <span aria-hidden="true">{completed ? "✓" : "→"}</span>
      {completed ? "Блок пройден" : id === "contains" ? "Завершить главу" : "Завершить блок"}
    </button>
  );
}

function StringTheoryLessonStatus({
  id,
  completed,
  onComplete,
}: {
  id: StringTheoryLessonId;
  completed: boolean;
  onComplete: (id: StringTheoryLessonId) => void;
}) {
  return (
    <button
      className={`theory-complete-button ${completed ? "is-complete" : ""}`}
      disabled={completed}
      onClick={() => onComplete(id)}
    >
      <span aria-hidden="true">{completed ? "✓" : "→"}</span>
      {completed ? "Блок пройден" : id === "step" ? "Завершить главу" : "Завершить блок"}
    </button>
  );
}

function WhileTheoryLessonStatus({
  id,
  completed,
  onComplete,
}: {
  id: WhileTheoryLessonId;
  completed: boolean;
  onComplete: (id: WhileTheoryLessonId) => void;
}) {
  return (
    <button
      className={`theory-complete-button ${completed ? "is-complete" : ""}`}
      disabled={completed}
      onClick={() => onComplete(id)}
    >
      <span aria-hidden="true">{completed ? "✓" : "→"}</span>
      {completed ? "Блок пройден" : id === "infinite" ? "Завершить главу" : "Завершить блок"}
    </button>
  );
}

function ForTheoryLessonStatus({
  id,
  completed,
  onComplete,
}: {
  id: ForTheoryLessonId;
  completed: boolean;
  onComplete: (id: ForTheoryLessonId) => void;
}) {
  return (
    <button
      className={`theory-complete-button ${completed ? "is-complete" : ""}`}
      disabled={completed}
      onClick={() => onComplete(id)}
    >
      <span aria-hidden="true">{completed ? "✓" : "→"}</span>
      {completed ? "Блок пройден" : id === "comparison" ? "Завершить главу" : "Завершить блок"}
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
            <div className="crate-payload">
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

const arithmeticOperations = [
  { operator: "+", example: "2 + 3", result: "5", label: "сложение" },
  { operator: "−", example: "5 - 1", result: "4", label: "вычитание" },
  { operator: "×", example: "4 * 6", result: "24", label: "умножение" },
  { operator: "÷", example: "10 / 2", result: "5.0", label: "деление" },
  { operator: "xⁿ", example: "2 ** 3", result: "8", label: "степень" },
];

function ArithmeticIntroGraphic() {
  return (
    <div className="arithmetic-intro-graphic" aria-label="Один оператор плюс по-разному работает с числами и строками">
      <div className="arithmetic-calculator" aria-hidden="true">
        <span className="calculator-display">
          <small>Калькулятор</small>
          <strong>5 + 3</strong>
          <b>= 8</b>
        </span>
        <span className="calculator-keys">
          {["7", "8", "9", "+", "4", "5", "6", "−", "1", "2", "3", "="].map((key) => (
            <i key={key}>{key}</i>
          ))}
        </span>
      </div>
      <div className="arithmetic-data-flow" aria-hidden="true">
        <div className="data-flow-row is-number">
          <code>5</code><span>+</span><code>3</code><i>→</i><strong>8</strong>
          <small>числа складываются</small>
        </div>
        <div className="data-flow-row is-string">
          <code>&quot;Привет&quot;</code><span>+</span><code>&quot;Мир&quot;</code><i>→</i>
          <strong>&quot;ПриветМир&quot;</strong>
          <small>строки соединяются</small>
        </div>
      </div>
      <p>Один и тот же знак <code>+</code> выполняет разные действия — всё зависит от типа данных.</p>
    </div>
  );
}

function ArithmeticOperationsTable() {
  return (
    <div className="arithmetic-operations" role="table" aria-label="Арифметические операции Python">
      <div className="arithmetic-operation is-heading" role="row">
        <span role="columnheader">Знак</span>
        <span role="columnheader">Пример</span>
        <span role="columnheader">Результат</span>
        <span role="columnheader">Действие</span>
      </div>
      {arithmeticOperations.map((operation) => (
        <div className="arithmetic-operation" role="row" key={operation.example}>
          <strong role="cell">{operation.operator}</strong>
          <code role="cell">{operation.example}</code>
          <b role="cell">{operation.result}</b>
          <span role="cell">{operation.label}</span>
        </div>
      ))}
    </div>
  );
}

function LongDivisionGraphic() {
  return (
    <div className="long-division-graphic" aria-label="123 делим на 7 столбиком: целая часть 17, остаток 4">
      <header>
        <div>
          <small>Деление столбиком</small>
          <strong>Что именно возвращают <code>{"//"}</code> и <code>%</code></strong>
        </div>
        <span>анимация повторяется</span>
      </header>
      <div className="long-division-stage">
        <div className="long-division-paper" aria-hidden="true">
          <span className="division-number">123</span>
          <span className="division-bracket" />
          <span className="division-divisor">7</span>
          <span className="division-answer">17</span>
          <span className="division-step division-step-one">− 7</span>
          <span className="division-step division-step-two">53</span>
          <span className="division-step division-step-three">− 49</span>
          <span className="division-remainder">4</span>
        </div>
        <div className="division-meaning">
          <div className="division-result is-whole">
            <span>Сколько раз поместилось</span>
            <code>123 // 7</code>
            <strong>17</strong>
            <small>целая часть</small>
          </div>
          <div className="division-result is-rest">
            <span>Что осталось</span>
            <code>123 % 7</code>
            <strong>4</strong>
            <small>остаток</small>
          </div>
        </div>
      </div>
      <p><code>123 = 7 × 17 + 4</code> — целая часть и остаток вместе полностью описывают деление.</p>
    </div>
  );
}

function DivisionCodeGraphic() {
  const rows = [
    ["x = 7", ""],
    ["y = 3", ""],
    ["print(x / y)", "2.333…"],
    ["print(x // y)", "2"],
    ["print(x % y)", "1"],
  ];

  return (
    <div className="division-code-graphic">
      <EditorFrame file="division.py">
        <div className="theory-code division-code-lines">
          {rows.map(([line, result], index) => (
            <div key={line} className={`division-code-line division-code-line-${index + 1}`}>
              <span>{index + 1}</span>
              <code>{line}</code>
              <i>{result}</i>
            </div>
          ))}
        </div>
      </EditorFrame>
      <div className="division-rule-cards">
        <div><code>/</code><span>обычное деление</span><strong>результат — float</strong></div>
        <div><code>{"//"}</code><span>целочисленное</span><strong>не округляет</strong></div>
        <div><code>%</code><span>остаток</span><strong>после деления</strong></div>
      </div>
    </div>
  );
}

function StringOperationsGraphic() {
  return (
    <div className="string-operations-graphic" aria-label="Числа складываются, строки соединяются">
      <header>
        <small>Один знак — разные действия</small>
        <strong>Python сначала смотрит на тип</strong>
      </header>
      <div className="string-operation-lanes">
        <div className="string-operation-lane is-number" aria-hidden="true">
          <span className="operand-card"><small>int</small><code>5</code></span>
          <b>+</b>
          <span className="operand-card"><small>int</small><code>3</code></span>
          <i>→</i>
          <span className="operation-result"><small>сложение</small><code>8</code></span>
        </div>
        <div className="string-operation-lane is-text" aria-hidden="true">
          <span className="operand-card"><small>str</small><code>&quot;Привет&quot;</code></span>
          <b>+</b>
          <span className="operand-card"><small>str</small><code>&quot;Мир&quot;</code></span>
          <i>→</i>
          <span className="operation-result"><small>конкатенация</small><code>&quot;ПриветМир&quot;</code></span>
        </div>
      </div>
      <p>Кавычки не декор: именно они говорят Python, что перед ним текст.</p>
    </div>
  );
}

function StringRepeatEditor() {
  return (
    <EditorFrame file="strings.py" className="string-repeat-editor">
      <div className="theory-code is-static">
        {[
          ["1", 'text = "ха"'],
          ["2", "print(text * 3)"],
        ].map(([line, code]) => (
          <div key={line}>
            <span>{line}</span>
            <code>{code}</code>
          </div>
        ))}
      </div>
      <div className="string-repeat-output">
        <span>Вывод</span>
        <code>хахаха</code>
      </div>
    </EditorFrame>
  );
}

function TypeMismatchGraphic() {
  return (
    <div className="type-mismatch-graphic" aria-label="Строку и число нельзя сложить напрямую">
      <div className="mismatch-equation" aria-hidden="true">
        <span className="mismatch-value is-string"><small>str</small><code>&quot;5&quot;</code></span>
        <b>+</b>
        <span className="mismatch-value is-number"><small>int</small><code>3</code></span>
        <i>→</i>
        <span className="mismatch-error"><strong>TypeError</strong><small>разные типы</small></span>
      </div>
      <div className="mismatch-rails" aria-hidden="true"><i /><i /></div>
      <p><strong>Нельзя сложить напрямую.</strong> Сначала данные нужно привести к одному типу — это разберём дальше.</p>
    </div>
  );
}

const shortcutOperations = [
  ["x = x + 2", "x += 2", "прибавить 2"],
  ["x = x - 3", "x -= 3", "вычесть 3"],
  ["x = x * 4", "x *= 4", "умножить на 4"],
  ["x = x / 5", "x /= 5", "разделить на 5"],
  ["x = x ** 2", "x **= 2", "возвести в квадрат"],
  ["x = x % 3", "x %= 3", "оставить остаток"],
];

function ShortcutGraphic() {
  return (
    <div className="shortcut-graphic">
      <div className="shortcut-editors">
        <EditorFrame file="full.py">
          <div className="shortcut-code">
            <span>1</span><code>x = 5</code>
            <span>2</span><code>x = x - 1</code>
            <span>3</span><code>print(x) <i># 4</i></code>
          </div>
        </EditorFrame>
        <span className="shortcut-equals">то же самое</span>
        <EditorFrame file="short.py">
          <div className="shortcut-code">
            <span>1</span><code>x = 5</code>
            <span>2</span><code>x -= 1</code>
            <span>3</span><code>print(x) <i># 4</i></code>
          </div>
        </EditorFrame>
      </div>
      <div className="shortcut-steps">
        <span><i>1</i>взять текущее <code>x</code></span>
        <span><i>2</i>вычесть <code>1</code></span>
        <span><i>3</i>записать обратно</span>
      </div>
    </div>
  );
}

function ShortcutTable() {
  return (
    <div className="shortcut-table" role="table" aria-label="Сокращённая запись операций">
      <div className="shortcut-row is-heading" role="row">
        <span role="columnheader">Полная запись</span>
        <span role="columnheader">Короткая</span>
        <span role="columnheader">Что делает</span>
      </div>
      {shortcutOperations.map(([full, short, label]) => (
        <div className="shortcut-row" role="row" key={short}>
          <code role="cell">{full}</code>
          <code role="cell">{short}</code>
          <span role="cell">{label}</span>
        </div>
      ))}
    </div>
  );
}

function ArithmeticCheck() {
  const [answer, setAnswer] = useState<string | null>(null);
  const options = ["ха3", "хахаха", "Ошибка"];

  return (
    <div className="arithmetic-check">
      <div>
        <small>Быстрая проверка</small>
        <strong>Что выведет программа?</strong>
        <code>print(&quot;ха&quot; * 3)</code>
      </div>
      <div className="arithmetic-check-options">
        {options.map((option) => (
          <button
            className={`${answer === option ? "is-selected" : ""} ${
              answer && option === "хахаха" ? "is-correct" : ""
            }`}
            onClick={() => setAnswer(option)}
            key={option}
          >
            {option}
          </button>
        ))}
      </div>
      {answer && (
        <p className={answer === "хахаха" ? "is-correct" : ""}>
          {answer === "хахаха"
            ? "Верно: строка повторяется три раза."
            : "Почти. Умножение строки повторяет её указанное число раз."}
        </p>
      )}
    </div>
  );
}

function EverydayConditionsGraphic() {
  const situations = [
    ["идёт дождь", "взять зонт", "☂"],
    ["опаздываешь", "ускорить шаг", "→"],
    ["проголодался", "пойти есть", "○"],
  ];

  return (
    <div className="everyday-conditions" aria-label="Повседневные условия: если произошло событие, выполняется действие">
      <header>
        <small>Условие в обычной жизни</small>
        <strong>Сначала проверка — затем действие</strong>
      </header>
      <div className="everyday-condition-list">
        {situations.map(([condition, action, symbol], index) => (
          <div className={`everyday-condition condition-${index + 1}`} key={condition}>
            <span className="condition-symbol" aria-hidden="true">{symbol}</span>
            <div><small>если</small><strong>{condition}</strong></div>
            <i aria-hidden="true">→</i>
            <div><small>то</small><strong>{action}</strong></div>
          </div>
        ))}
      </div>
      <p>Программа делает то же самое, но проверку нужно записать абсолютно точно.</p>
    </div>
  );
}

function IfFlowGraphic() {
  return (
    <div className="if-flow-graphic" aria-label="Если x больше пяти, программа выводит Больше пяти">
      <EditorFrame file="condition.py" className="if-flow-editor">
        <div className="condition-code-lines">
          <span><i>1</i><code>x = 10</code></span>
          <span className="is-condition"><i>2</i><code><b>if</b> x &gt; 5:</code></span>
          <span className="is-indented"><i>3</i><code>print(&quot;Больше пяти&quot;)</code></span>
        </div>
      </EditorFrame>
      <div className="if-flow-map" aria-hidden="true">
        <span className="flow-start">x = 10</span>
        <i className="flow-downline" />
        <span className="flow-decision"><code>x &gt; 5?</code></span>
        <div className="flow-branches">
          <div className="flow-branch is-true">
            <span>True</span>
            <i>↓</i>
            <strong>вывести<br />«Больше пяти»</strong>
          </div>
          <div className="flow-branch is-false">
            <span>False</span>
            <i>↓</i>
            <strong>пропустить блок</strong>
          </div>
        </div>
      </div>
      <p><code>if</code> запускает вложенный блок только тогда, когда условие равно <code>True</code>.</p>
    </div>
  );
}

function BranchChoiceGraphic() {
  return (
    <div className="branch-choice-graphic" aria-label="Цепочка if elif else выбирает ровно одну ветку">
      <div className="branch-value-cycle" aria-hidden="true">
        <small>Текущее значение</small>
        <span className="branch-value value-one">8</span>
        <span className="branch-value value-two">5</span>
        <span className="branch-value value-three">2</span>
      </div>
      <div className="branch-tree" aria-hidden="true">
        <div className="branch-node branch-if"><code>if x &gt; 5</code><span>Больше пяти</span></div>
        <div className="branch-node branch-elif"><code>elif x == 5</code><span>Ровно пять</span></div>
        <div className="branch-node branch-else"><code>else</code><span>Меньше пяти</span></div>
      </div>
      <div className="branch-output">
        <small>Вывод</small>
        <strong className="branch-output-one">Больше пяти</strong>
        <strong className="branch-output-two">Ровно пять</strong>
        <strong className="branch-output-three">Меньше пяти</strong>
      </div>
      <p><code>elif</code> проверяется только если предыдущая ветка не сработала. В итоге выбирается одна ветка.</p>
    </div>
  );
}

function IndependentChecksGraphic() {
  const conditions = [
    ["x % 2 == 0", "делится на 2"],
    ["x % 3 == 0", "делится на 3"],
    ["x % 4 == 0", "делится на 4"],
  ];

  return (
    <div className="independent-checks-graphic" aria-label="Несколько if могут сработать вместе, цепочка if elif выбирает первую подходящую ветку">
      <header>
        <small>Одинаковое число: x = 12</small>
        <strong>Три независимые проверки или один выбор</strong>
      </header>
      <div className="checks-comparison">
        <div className="check-system is-independent">
          <div className="check-system-heading"><code>if · if · if</code><span>проверяем всё</span></div>
          {conditions.map(([condition, output]) => (
            <div className="check-row" key={condition}>
              <code>{condition}</code><i>True</i><span>{output}</span>
            </div>
          ))}
          <div className="check-output"><small>Вывод</small><strong>3 строки</strong></div>
        </div>
        <div className="check-system is-chain">
          <div className="check-system-heading"><code>if · elif · elif</code><span>до первого True</span></div>
          {conditions.map(([condition, output], index) => (
            <div className={`check-row ${index > 0 ? "is-skipped" : ""}`} key={condition}>
              <code>{condition}</code><i>{index === 0 ? "True" : "—"}</i><span>{output}</span>
            </div>
          ))}
          <div className="check-output"><small>Вывод</small><strong>1 строка</strong></div>
        </div>
      </div>
      <p><strong>Несколько <code>if</code></strong> независимы. <strong>Цепочка</strong> прекращает проверки после первой подходящей ветки.</p>
    </div>
  );
}

function IndentationCodeScope({
  lines,
  inside = false,
}: {
  lines: string[][];
  inside?: boolean;
}) {
  return (
    <div className={`indentation-example ${inside ? "is-inside" : "is-outside"}`}>
      <EditorFrame file={inside ? "inside.py" : "outside.py"}>
        <div className="indentation-code">
          <span className="indent-guide" aria-hidden="true" />
          {lines.map(([number, code, state]) => (
            <div className={state} key={number}>
              <i>{number}</i><code>{code}</code>
            </div>
          ))}
        </div>
      </EditorFrame>
      <div className="indentation-result">
        <div>
          <small>x = 10</small>
          <code>опа</code>
          <code>конец</code>
        </div>
        <div>
          <small>x = 5</small>
          <code>ура</code>
          {!inside && <code>конец</code>}
        </div>
        {inside && <span>обе строки принадлежат <b>else</b></span>}
        {!inside && <span><b>конец</b> выполнится при любом x</span>}
      </div>
    </div>
  );
}

function IndentationScopeGraphic() {
  const outsideLines = [
    ["1", "x = 10", ""],
    ["2", "if x == 5:", "if"],
    ["3", "    print('ура')", "inside"],
    ["4", "else:", "else"],
    ["5", "    print('опа')", "inside"],
    ["6", "print('конец')", "always"],
  ];
  const insideLines = [
    ["1", "x = 10", ""],
    ["2", "if x == 5:", "if"],
    ["3", "    print('ура')", "inside"],
    ["4", "else:", "else"],
    ["5", "    print('опа')", "inside"],
    ["6", "    print('конец')", "inside-last"],
  ];

  return (
    <div className="indentation-scope-graphic" aria-label="Отступ определяет, относится ли команда к else или выполняется всегда">
      <header>
        <small>Отступ — это граница блока</small>
        <strong>Одна строка левее полностью меняет логику</strong>
      </header>
      <div className="indentation-comparison">
        <IndentationCodeScope lines={outsideLines} />
        <IndentationCodeScope lines={insideLines} inside />
      </div>
      <div className="indentation-legend">
        <span><i className="legend-inside" />внутри условия</span>
        <span><i className="legend-always" />выполняется всегда</span>
      </div>
    </div>
  );
}

function IndentationErrorGraphic() {
  return (
    <div className="indentation-error-graphic">
      <EditorFrame file="error.py">
        <div className="indentation-error-code">
          <span><i>1</i><code>x = 10</code></span>
          <span><i>2</i><code><b>if</b> x &gt; 5:</code></span>
          <span className="is-error"><i>3</i><code>print(&quot;Ошибка&quot;)</code></span>
        </div>
        <div className="indentation-console">
          <small>Python</small>
          <code>IndentationError: expected an indented block</code>
          <span>Ожидался отступ после <b>if</b></span>
        </div>
      </EditorFrame>
    </div>
  );
}

const comparisonOperators = [
  ["==", "x == 5", "равно"],
  ["!=", "x != 2", "не равно"],
  ["<", "x < 10", "меньше"],
  [">", "x > 3", "больше"],
  ["<=", "x <= 7", "меньше или равно"],
  [">=", "x >= 0", "больше или равно"],
];

function ComparisonOperatorsTable() {
  return (
    <div className="comparison-operators" role="table" aria-label="Операторы сравнения Python">
      <div className="comparison-row is-heading" role="row">
        <span role="columnheader">Оператор</span>
        <span role="columnheader">Пример</span>
        <span role="columnheader">Вопрос</span>
      </div>
      {comparisonOperators.map(([operator, example, label]) => (
        <div className="comparison-row" role="row" key={operator}>
          <code role="cell">{operator}</code>
          <code role="cell">{example}</code>
          <span role="cell">{label}</span>
        </div>
      ))}
    </div>
  );
}

function BooleanLogicGraphic() {
  return (
    <div className="boolean-logic-graphic" aria-label="and требует два истинных условия, or хотя бы одно, not меняет результат на противоположный">
      <div className="logic-gate is-and">
        <header><code>and</code><span>оба условия</span></header>
        <div><i>True</i><i>True</i><b>→</b><strong>True</strong></div>
        <small><code>x &gt; 5 and x &lt; 10</code></small>
      </div>
      <div className="logic-gate is-or">
        <header><code>or</code><span>хотя бы одно</span></header>
        <div><i>True</i><i>False</i><b>→</b><strong>True</strong></div>
        <small><code>x &lt; 0 or x &gt; 100</code></small>
      </div>
      <div className="logic-gate is-not">
        <header><code>not</code><span>наоборот</span></header>
        <div><i>True</i><b>→</b><strong>False</strong></div>
        <small><code>not x == 5</code></small>
      </div>
    </div>
  );
}

function ContainsGraphic() {
  const letters = "информатика".split("");

  return (
    <div className="contains-graphic" aria-label="Подстрока фор находится внутри слова информатика">
      <header>
        <small>Поиск внутри строки</small>
        <strong><code>&quot;фор&quot; in &quot;информатика&quot;</code></strong>
      </header>
      <div className="contains-word" aria-hidden="true">
        {letters.map((letter, index) => (
          <span className={index >= 2 && index <= 4 ? "is-match" : ""} key={`${letter}-${index}`}>
            {letter}
          </span>
        ))}
        <i className="contains-scanner" />
      </div>
      <div className="contains-result"><span>подстрока найдена</span><strong>True</strong></div>
      <div className="contains-examples">
        <span><code>&quot;а&quot; in &quot;мама&quot;</code><b>True</b></span>
        <span><code>&quot;мам&quot; in &quot;мама&quot;</code><b>True</b></span>
        <span><code>&quot;ко&quot; in &quot;мама&quot;</code><b>False</b></span>
      </div>
      <p><code>in</code> ищет символ, подстроку или элемент списка и всегда возвращает <code>True</code> либо <code>False</code>.</p>
    </div>
  );
}

function ConditionErrorsGraphic() {
  return (
    <div className="condition-errors">
      <div className="condition-error-card">
        <span>01</span>
        <div><small>Нет отступа</small><code>if x &gt; 5:<br />print(&quot;Привет&quot;)</code></div>
        <strong>IndentationError</strong>
      </div>
      <div className="condition-error-card">
        <span>02</span>
        <div><small>Одно равно</small><code>if x = 5:</code></div>
        <strong>SyntaxError</strong>
      </div>
      <div className="condition-error-fix">
        <small>Правильно</small>
        <code>if x == 5:</code>
        <span><b>=</b> присваивает, <b>==</b> сравнивает</span>
      </div>
    </div>
  );
}

function IndentationCheck() {
  const [answer, setAnswer] = useState<string | null>(null);
  const options = ["Только «опа»", "«опа» и «конец»", "Только «конец»"];

  return (
    <div className="arithmetic-check condition-check">
      <div>
        <small>Быстрая проверка</small>
        <strong>Что выведет код при x = 10?</strong>
        <code>if x == 5:<br />&nbsp;&nbsp;&nbsp;&nbsp;print(&quot;ура&quot;)<br />else:<br />&nbsp;&nbsp;&nbsp;&nbsp;print(&quot;опа&quot;)<br />print(&quot;конец&quot;)</code>
      </div>
      <div className="arithmetic-check-options">
        {options.map((option) => (
          <button
            className={`${answer === option ? "is-selected" : ""} ${
              answer && option === "«опа» и «конец»" ? "is-correct" : ""
            }`}
            onClick={() => setAnswer(option)}
            key={option}
          >
            {option}
          </button>
        ))}
      </div>
      {answer && (
        <p className={answer === "«опа» и «конец»" ? "is-correct" : ""}>
          {answer === "«опа» и «конец»"
            ? "Верно: «опа» относится к else, а «конец» стоит без отступа и выполняется всегда."
            : "Посмотри на отступ последней строки: она находится вне if–else."}
        </p>
      )}
    </div>
  );
}

const theoryStringCharacters = Array.from("информатика");

function StringCellStrip({
  selected = [],
  stop,
  className = "",
}: {
  selected?: number[];
  stop?: number;
  className?: string;
}) {
  return (
    <div className={`string-cell-strip ${className}`} aria-hidden="true">
      {theoryStringCharacters.map((character, index) => (
        <span
          className={`${selected.includes(index) ? "is-selected" : ""} ${
            stop === index ? "is-stop" : ""
          }`}
          key={`${character}-${index}`}
        >
          {character}
        </span>
      ))}
    </div>
  );
}

function StringIndexGraphic() {
  return (
    <div
      className="string-index-graphic"
      aria-label="В строке информатика положительные индексы идут от нуля слева направо, отрицательные — от минус одного справа налево"
    >
      <header>
        <div>
          <small>Две шкалы одной строки</small>
          <strong>У каждого символа есть адрес</strong>
        </div>
        <code>s = &quot;информатика&quot;</code>
      </header>
      <div className="string-index-stage">
        <div className="string-index-direction is-forward">
          <span>начало</span>
          <i />
          <strong>слева направо</strong>
        </div>
        <div className="string-index-row is-positive" aria-hidden="true">
          {theoryStringCharacters.map((_, index) => <span key={index}>{index}</span>)}
        </div>
        <StringCellStrip className="is-index-demo" />
        <div className="string-index-row is-negative" aria-hidden="true">
          {theoryStringCharacters.map((_, index) => (
            <span key={index}>{index - theoryStringCharacters.length}</span>
          ))}
        </div>
        <div className="string-index-direction is-backward">
          <strong>справа налево</strong>
          <i />
          <span>конец</span>
        </div>
      </div>
      <div className="string-index-calls" aria-hidden="true">
        <span className="index-call call-zero"><code>s[0]</code><b>и</b></span>
        <span className="index-call call-three"><code>s[3]</code><b>о</b></span>
        <span className="index-call call-last"><code>s[-1]</code><b>а</b></span>
      </div>
      <p>Положительный адрес начинается с <code>0</code>, а последний символ всегда доступен по <code>-1</code>.</p>
    </div>
  );
}

function StringIndexEditor() {
  return (
    <EditorFrame file="indexes.py" className="string-index-editor">
      <div className="theory-code is-static">
        {[
          ["1", 's = "информатика"'],
          ["2", "print(s[0])", "# и"],
          ["3", "print(s[3])", "# о"],
          ["4", "print(s[-1])", "# а"],
        ].map(([line, code, note]) => (
          <div key={line}>
            <span>{line}</span>
            <code>{code} {note && <i>{note}</i>}</code>
          </div>
        ))}
      </div>
    </EditorFrame>
  );
}

function IndexErrorGraphic() {
  return (
    <div className="index-error-graphic">
      <EditorFrame file="too_far.py">
        <div className="index-error-lines">
          <div className="index-error-line">
            <span>1</span>
            <code>s = &quot;информатика&quot;</code>
          </div>
          <div className="index-error-line is-error">
            <span>2</span>
            <code>print(s[20])</code>
          </div>
        </div>
        <div className="index-error-console">
          <small>Python остановился</small>
          <code>IndexError: string index out of range</code>
        </div>
      </EditorFrame>
      <aside className="index-error-explanation">
        <div>
          <small>Почему возникла ошибка?</small>
          <strong>Индекс 20 находится за границей строки</strong>
          <p>
            В строке «информатика» 11 символов. При счёте слева им соответствуют индексы от
            <code> 0</code> до <code>10</code>. Запись <code>s[20]</code> просит Python взять
            двадцать первый символ, которого здесь нет, поэтому программа останавливается.
          </p>
        </div>
        <span>
          <small>Доступно слева</small>
          <code>s[0] … s[10]</code>
        </span>
      </aside>
    </div>
  );
}

function NegativeIndexGraphic() {
  const tail = [
    ["s[-1]", "а", "последний"],
    ["s[-2]", "к", "предпоследний"],
    ["s[-4]", "т", "четвёртый с конца"],
  ];

  return (
    <div className="negative-index-graphic" aria-label="Отрицательные индексы считают символы с конца строки">
      <header>
        <div>
          <small>Не нужно вычислять длину</small>
          <strong>Конец строки всегда рядом</strong>
        </div>
      </header>
      <div className="negative-index-stage">
        <StringCellStrip selected={[7, 9, 10]} />
        <div className="negative-index-tail" aria-hidden="true">
          <span><i>−4</i>т</span>
          <span><i>−2</i>к</span>
          <span><i>−1</i>а</span>
        </div>
      </div>
      <div className="negative-index-examples">
        {tail.map(([expression, result, label]) => (
          <div key={expression}>
            <code>{expression}</code>
            <strong>{result}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <p>Если нужен символ с конца, отрицательная запись обычно короче и понятнее.</p>
    </div>
  );
}

const sliceWindows = [
  { expression: "s[0:4]", result: "инфо", selected: [0, 1, 2, 3], stop: 4 },
  { expression: "s[3:7]", result: "орма", selected: [3, 4, 5, 6], stop: 7 },
] as const;

function SliceBoundaryStrip({
  word,
  selected,
}: {
  word: string;
  selected: number[];
}) {
  return (
    <div
      className="slice-boundary-strip"
      style={{ gridTemplateColumns: `repeat(${word.length}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from(word).map((character, index) => (
        <span className={selected.includes(index) ? "is-selected" : ""} key={`${character}-${index}`}>
          <i>{index}</i>
          <b>{character}</b>
        </span>
      ))}
    </div>
  );
}

function SliceBoundaryGraphic() {
  const word = "алгоритм";
  const groups = [
    {
      kind: "is-from-start",
      eyebrow: "Не написали начало",
      title: "Начинаем с самого первого символа",
      rule: "s[:до]",
      explanation:
        "Пустое место слева от двоеточия означает индекс 0. Правая граница по-прежнему не входит.",
      examples: [
        { expression: "s[:2]", result: "ал", selected: [0, 1] },
        { expression: "s[:4]", result: "алго", selected: [0, 1, 2, 3] },
        { expression: "s[:6]", result: "алгори", selected: [0, 1, 2, 3, 4, 5] },
      ],
    },
    {
      kind: "is-to-end",
      eyebrow: "Не написали конец",
      title: "Продолжаем до последнего символа",
      rule: "s[от:]",
      explanation:
        "Пустое место справа от двоеточия означает: не останавливайся, иди до конца строки.",
      examples: [
        { expression: "s[2:]", result: "горитм", selected: [2, 3, 4, 5, 6, 7] },
        { expression: "s[4:]", result: "ритм", selected: [4, 5, 6, 7] },
        { expression: "s[-3:]", result: "итм", selected: [5, 6, 7] },
      ],
    },
  ];

  return (
    <div
      className="slice-boundary-graphic"
      aria-label="Примеры срезов от начала строки и до конца строки"
    >
      <header>
        <div>
          <small>Пустая граница — это команда</small>
          <strong>Python сам подставляет край строки</strong>
        </div>
        <code>s = &quot;алгоритм&quot;</code>
      </header>
      {groups.map((group, groupIndex) => (
        <section className={group.kind} key={group.rule}>
          <div className="slice-boundary-copy">
            <span>0{groupIndex + 1}</span>
            <div>
              <small>{group.eyebrow}</small>
              <h4>{group.title}</h4>
              <code>{group.rule}</code>
              <p>{group.explanation}</p>
            </div>
          </div>
          <div className="slice-boundary-examples">
            {group.examples.map((example) => (
              <div className="slice-boundary-example" key={example.expression}>
                <div>
                  <code>{example.expression}</code>
                  <i>→</i>
                  <strong>&quot;{example.result}&quot;</strong>
                </div>
                <SliceBoundaryStrip word={word} selected={example.selected} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <p>
        Запомни чтение: <code>s[:4]</code> — «от начала до 4», а <code>s[4:]</code> — «от 4 до
        конца». Двоеточие показывает, что мы берём фрагмент, а не один символ.
      </p>
    </div>
  );
}

function SliceWindowGraphic() {
  return (
    <div className="slice-window-graphic" aria-label="Срез берёт символы от левой границы до правой, не включая правую">
      <header>
        <div>
          <small>Формула среза</small>
          <strong><code>s[от:до]</code></strong>
        </div>
        <span><i />входит в срез <b />граница «до»</span>
      </header>
      <div className="slice-window-list">
        {sliceWindows.map((slice) => (
          <div className="slice-window-row" key={slice.expression}>
            <div className="slice-window-code">
              <code>{slice.expression}</code>
              <i>→</i>
              <strong>&quot;{slice.result}&quot;</strong>
            </div>
            <div className="slice-window-ruler">
              <div className="string-index-row is-positive" aria-hidden="true">
                {theoryStringCharacters.map((_, index) => <span key={index}>{index}</span>)}
              </div>
              <StringCellStrip
                selected={[...slice.selected]}
                stop={slice.stop}
                className="is-slice-demo"
              />
            </div>
          </div>
        ))}
      </div>
      <p>
        Левая граница входит в результат. Правая только показывает, где остановиться, поэтому
        символ с индексом <code>до</code> не берётся.
      </p>
    </div>
  );
}

function SliceCodeEditor() {
  return (
    <EditorFrame file="slices.py" className="slice-code-editor">
      <div className="theory-code is-static">
        {[
          ["1", 's = "информатика"'],
          ["2", "print(s[0:4])", "# инфо"],
          ["3", "print(s[3:7])", "# орма"],
          ["4", "print(s[-4:])", "# тика"],
          ["5", "print(s[:-5])", "# информ"],
        ].map(([line, code, note]) => (
          <div key={line}>
            <span>{line}</span>
            <code>{code} {note && <i>{note}</i>}</code>
          </div>
        ))}
      </div>
    </EditorFrame>
  );
}

function SliceStepGraphic() {
  const stepRows = [
    { expression: "s[::2]", result: "ифраиа", selected: [0, 2, 4, 6, 8, 10] },
    { expression: "s[1::2]", result: "номтк", selected: [1, 3, 5, 7, 9] },
  ];

  return (
    <div className="slice-step-graphic" aria-label="Шаг два берёт каждый второй символ строки">
      <header>
        <div>
          <small>Третий параметр</small>
          <strong><code>s[от:до:шаг]</code></strong>
        </div>
      </header>
      <div className="slice-step-list">
        {stepRows.map((row) => (
          <div className="slice-step-row" key={row.expression}>
            <div>
              <code>{row.expression}</code>
              <span>каждый второй символ</span>
              <strong>{row.result}</strong>
            </div>
            <StringCellStrip selected={row.selected} />
          </div>
        ))}
      </div>
      <div className="slice-shortcuts">
        <span><code>s[-4:]</code><i>→</i><strong>тика</strong><small>от −4 до конца</small></span>
        <span><code>s[:-5]</code><i>→</i><strong>информ</strong><small>от начала до −5</small></span>
      </div>
    </div>
  );
}

function StringNumberGraphic() {
  const examples = [
    { expression: '"3" + "4"', result: '"34"', label: "строки соединяются", kind: "is-string" },
    { expression: "3 + 4", result: "7", label: "числа складываются", kind: "is-number" },
    { expression: '"3" * 2', result: '"33"', label: "строка повторяется два раза", kind: "is-string" },
    { expression: "3 * 2", result: "6", label: "числа умножаются", kind: "is-number" },
    {
      expression: '"3" * "2"',
      result: "TypeError",
      label: "нельзя умножить строку на строку: количество повторений должно быть целым числом",
      kind: "is-error",
    },
  ];

  return (
    <div className="string-number-graphic">
      <header>
        <div>
          <small>Внешность обманчива</small>
          <strong>Кавычки меняют смысл операции</strong>
        </div>
      </header>
      <div>
        {examples.map((example) => (
          <span className={example.kind} key={example.expression}>
            <code>{example.expression}</code>
            <i>→</i>
            <b>{example.result}</b>
            <small>{example.label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function StringSliceCheck() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questions = [
    {
      id: "planet",
      word: "планета",
      expression: "s[1:5]",
      answer: "лане",
      options: ["лан", "лане", "анет"],
      success: "Верно: берём символы с индексами 1, 2, 3 и 4. Индекс 5 уже не входит.",
      retry: "Начни с индекса 1 и остановись прямо перед индексом 5.",
    },
    {
      id: "computer",
      word: "компьютер",
      expression: "s[3:]",
      answer: "пьютер",
      options: ["мпьютер", "пьютер", "пьюте"],
      success: "Верно: начинаем с символа под индексом 3 и идём до самого конца строки.",
      retry: "Правая граница пустая — значит после индекса 3 нужно взять все оставшиеся символы.",
    },
  ];

  return (
    <div className="string-slice-check-list">
      {questions.map((question, index) => {
        const answer = answers[question.id];
        return (
          <div className="arithmetic-check string-slice-check" key={question.id}>
            <div>
              <small>Проверка {index + 1} из {questions.length}</small>
              <strong>Что вернёт этот срез?</strong>
              <code>
                s = &quot;{question.word}&quot;
                <br />
                print({question.expression})
              </code>
            </div>
            <div className="arithmetic-check-options">
              {question.options.map((option) => (
                <button
                  className={`${answer === option ? "is-selected" : ""} ${
                    answer && option === question.answer ? "is-correct" : ""
                  }`}
                  onClick={() =>
                    setAnswers((current) => ({ ...current, [question.id]: option }))
                  }
                  key={option}
                >
                  {option}
                </button>
              ))}
            </div>
            {answer && (
              <p className={answer === question.answer ? "is-correct" : ""}>
                {answer === question.answer ? question.success : question.retry}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WhileEverydayGraphic() {
  const examples = [
    ["100×", "написать «Привет!»", "одна и та же команда"],
    ["каждый", "символ длинного текста", "проверяем по очереди"],
    ["1…1000", "числа на делимость", "повторяем одну проверку"],
  ];

  return (
    <div className="while-everyday-graphic">
      <header>
        <div>
          <small>Ручной труд против цикла</small>
          <strong>Повторение превращаем в одну инструкцию</strong>
        </div>
      </header>
      <div className="while-everyday-list">
        {examples.map(([amount, task, note]) => (
          <span key={task}>
            <b>{amount}</b>
            <strong>{task}</strong>
            <small>{note}</small>
          </span>
        ))}
      </div>
      <div className="while-everyday-transform">
        <span>повтори вручную</span>
        <i>→</i>
        <code>while условие:</code>
        <strong>повторяй автоматически</strong>
      </div>
    </div>
  );
}

function WhileFlowGraphic() {
  const repeatedLines = Array.from({ length: 5 }, (_, index) => index + 1);

  return (
    <div
      className="while-flow-graphic"
      aria-label="Пять одинаковых команд можно заменить циклом while, который повторяет команду, пока условие истинно"
    >
      <header>
        <div>
          <small>Зачем нужен цикл</small>
          <strong>Пять одинаковых команд или одна инструкция?</strong>
        </div>
        <code>5 повторений</code>
      </header>

      <div className="while-purpose-stage">
        <section className="while-purpose-panel is-manual">
          <div className="while-purpose-heading">
            <span>Без цикла</span>
            <strong>Повторяем код вручную</strong>
          </div>
          <div className="while-repeat-code" aria-label="Пять одинаковых команд print">
            {repeatedLines.map((line) => (
              <div key={line}>
                <span>{line}</span>
                <code>print(&apos;hello, world&apos;)</code>
              </div>
            ))}
          </div>
          <p>Работает, но одна и та же команда написана пять раз.</p>
        </section>

        <div className="while-purpose-switch" aria-hidden="true">
          <span>Зачем повторять код?</span>
          <i>→</i>
          <strong>Скажем компьютеру повторить самому</strong>
        </div>

        <section className="while-purpose-panel is-loop">
          <div className="while-purpose-heading">
            <span>С циклом</span>
            <strong>Описываем повторение один раз</strong>
          </div>
          <EditorFrame file="hello_loop.py">
            <div className="theory-code is-static">
              <div><span>1</span><code>x = 0</code></div>
              <div className="is-active"><span>2</span><code><b>while</b> x &lt; 5:</code></div>
              <div className="is-indented"><span>3</span><code>    print(&apos;hello, world&apos;)</code></div>
              <div className="is-indented"><span>4</span><code>    x += 1</code></div>
            </div>
          </EditorFrame>
          <div className="while-value-track">
            <span>x</span>
            <b>0</b><i>→</i><b>1</b><i>→</i><b>2</b><i>→</i><b>3</b><i>→</i><b>4</b><i>→</i><b>5</b>
          </div>
        </section>
      </div>

      <div className="while-five-results" aria-label="Команда вывела hello world пять раз">
        {repeatedLines.map((line) => (
          <span key={line}><b>{line}</b>hello, world</span>
        ))}
      </div>

      <section className="while-decision">
        <div className="while-decision-heading">
          <small>Как цикл решает, повторять ли ещё?</small>
          <strong>Перед каждым кругом Python проверяет <code>x &lt; 5</code></strong>
        </div>
        <div className="while-condition-card">
          <span>УСЛОВИЕ</span>
          <code>x &lt; 5?</code>
        </div>
        <div className="while-branches">
          <article className="is-true">
            <header><span>ДА</span><strong>True</strong></header>
            <p>Выполнить весь блок с отступом:</p>
            <code>print(&apos;hello, world&apos;)</code>
            <code>x += 1</code>
            <b>↩ Проверить условие снова</b>
          </article>
          <article className="is-false">
            <header><span>НЕТ</span><strong>False</strong></header>
            <p>Не входить в блок ещё раз.</p>
            <div>Цикл закончен</div>
            <b>→ Программа идёт дальше</b>
          </article>
        </div>
      </section>

      <p className="while-flow-summary">
        Цикл нужен не для «магии», а чтобы <strong>не копировать одинаковый код</strong>.
        Мы один раз описываем действие и условие остановки — повторениями занимается Python.
      </p>
    </div>
  );
}

type WhileDebugNode = "start" | "condition" | "increment" | "print" | "end";

type WhileDebugPhase = {
  line: number;
  node: WhileDebugNode;
  x: number;
  condition: boolean | null;
  output: number[];
};

function createWhileDebugPhases(printInside: boolean): WhileDebugPhase[] {
  const phases: WhileDebugPhase[] = [
    { line: 1, node: "start", x: 0, condition: null, output: [] },
  ];
  const output: number[] = [];

  for (let value = 0; value < 5; value += 1) {
    phases.push({
      line: 2,
      node: "condition",
      x: value,
      condition: true,
      output: [...output],
    });
    phases.push({
      line: 3,
      node: "increment",
      x: value + 1,
      condition: true,
      output: [...output],
    });
    if (printInside) {
      output.push(value + 1);
      phases.push({
        line: 4,
        node: "print",
        x: value + 1,
        condition: true,
        output: [...output],
      });
    }
  }

  phases.push({
    line: 2,
    node: "condition",
    x: 5,
    condition: false,
    output: [...output],
  });

  if (printInside) {
    phases.push({ line: 2, node: "end", x: 5, condition: false, output: [...output] });
  } else {
    phases.push({ line: 4, node: "print", x: 5, condition: false, output: [5] });
    phases.push({ line: 4, node: "end", x: 5, condition: false, output: [5] });
  }

  return phases;
}

function WhileDebuggerGraphic({ printInside }: { printInside: boolean }) {
  const phases = useMemo(() => createWhileDebugPhases(printInside), [printInside]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = phases[phaseIndex] ?? phases[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % phases.length);
    }, 720);
    return () => window.clearInterval(timer);
  }, [phases]);

  const lines = printInside
    ? [
        ["x = 0", false],
        ["while x < 5:", false],
        ["x += 1", true],
        ["print(x)", true],
      ] as const
    : [
        ["x = 0", false],
        ["while x < 5:", false],
        ["x += 1", true],
        ["print(x)", false],
      ] as const;

  const truePathActive =
    phase.condition === true && ["condition", "increment", "print"].includes(phase.node);
  const falsePathActive = phase.condition === false;

  return (
    <div
      className={`while-debugger-graphic ${printInside ? "is-print-inside" : "is-print-outside"}`}
      aria-label={
        printInside
          ? "Отладка программы: print находится внутри while и выполняется на каждой итерации"
          : "Отладка программы: print находится после while и выполняется один раз"
      }
    >
      <header>
        <div>
          <small>{printInside ? "print с отступом" : "print без отступа"}</small>
          <strong>
            {printInside
              ? "Печать выполняется на каждом круге"
              : "Печать выполняется один раз после цикла"}
          </strong>
        </div>
        <span className="while-debugger-status">
          x = <b>{phase.x}</b>
        </span>
      </header>

      <div className="while-debugger-stage">
        <div className="while-debugger-code">
          <EditorFrame file={printInside ? "inside.py" : "outside.py"}>
            <div className="theory-code is-static">
              {lines.map(([line, indented], index) => (
                <div
                  className={`${indented ? "is-indented" : ""} ${
                    phase.line === index + 1 ? "is-debug-active" : ""
                  }`}
                  key={line}
                >
                  <span>{index + 1}</span>
                  <code>
                    {index === 1 ? <><b>while</b> x &lt; 5:</> : line}
                  </code>
                  {phase.line === index + 1 && <i>▶</i>}
                </div>
              ))}
            </div>
          </EditorFrame>
          <p>
            Акцентная строка — следующая команда, которую сейчас выполняет Python.
          </p>
        </div>

        <div className="while-debug-flow" aria-hidden="true">
          <span className={`debug-flow-node is-start ${phase.node === "start" ? "is-active" : ""}`}>
            <small>Старт</small><code>x = 0</code>
          </span>
          <i className="debug-flow-arrow">↓</i>
          <span className={`debug-flow-diamond ${phase.node === "condition" ? "is-active" : ""}`}>
            <code>x &lt; 5?</code>
          </span>
          <div className="debug-flow-results">
            <span className={truePathActive ? "is-active" : ""}>
              <small>ДА</small><b>True</b>
            </span>
            <span className={falsePathActive ? "is-active" : ""}>
              <small>НЕТ</small><b>False</b>
            </span>
          </div>
          <div className="debug-flow-paths">
            <div className="debug-flow-true-path">
              <span className={`debug-flow-node ${phase.node === "increment" ? "is-active" : ""}`}>
                <small>Изменить x</small><code>x += 1</code>
              </span>
              {printInside && (
                <span className={`debug-flow-node ${phase.node === "print" ? "is-active" : ""}`}>
                  <small>Напечатать</small><code>print(x)</code>
                </span>
              )}
              <b>↩ к проверке</b>
            </div>
            <div className="debug-flow-false-path">
              {!printInside && (
                <span className={`debug-flow-node ${phase.node === "print" ? "is-active" : ""}`}>
                  <small>После цикла</small><code>print(x)</code>
                </span>
              )}
              <span className={`debug-flow-node is-end ${phase.node === "end" ? "is-active" : ""}`}>
                <small>Дальше</small><strong>Цикл закончен</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="while-debug-output">
        <small>ВЫВОД</small>
        <div>
          {phase.output.length > 0 ? (
            phase.output.map((value, index) => (
              <code key={`${value}-${index}`}>{value}</code>
            ))
          ) : (
            <span>пока пусто</span>
          )}
          <i aria-hidden="true" />
        </div>
        <p>
          {printInside
            ? "print стоит с отступом и входит в повторяемый блок."
            : "print стоит без отступа и запускается только после первого False."}
        </p>
      </div>
    </div>
  );
}

function InfiniteWhileGraphic() {
  return (
    <div className="while-infinite-graphic">
      <header>
        <div>
          <small>Опасная ловушка</small>
          <strong>Условие должно когда-нибудь стать ложным</strong>
        </div>
      </header>
      <div className="while-infinite-main">
        <EditorFrame file="infinite.py">
          <div className="theory-code is-static">
            <div><span>1</span><code>x = 5</code></div>
            <div><span>2</span><code><b>while</b> x &gt; 0:</code></div>
            <div className="is-indented"><span>3</span><code>print(x)</code></div>
          </div>
        </EditorFrame>
        <div className="while-infinite-loop" aria-hidden="true">
          <span className="infinite-value">x = 5</span>
          <span className="infinite-check">x &gt; 0<br /><b>True</b></span>
          <span className="infinite-print">print(5)</span>
          <i>↻</i>
          <strong>ничего не меняет x</strong>
        </div>
      </div>
      <div className="while-infinite-output">
        <small>Вывод не заканчивается</small>
        <code>5&nbsp;&nbsp;5&nbsp;&nbsp;5&nbsp;&nbsp;5&nbsp;&nbsp;5&nbsp;&nbsp;5&nbsp;&nbsp;…</code>
      </div>
      <div className="while-infinite-fix">
        <span>Проблема</span>
        <p><code>x</code> всегда равно <code>5</code>, поэтому проверка всегда возвращает <code>True</code>.</p>
        <span>Исправление</span>
        <p>Добавь внутрь цикла изменение, которое приближает его к остановке: например, <code>x -= 1</code>.</p>
      </div>
    </div>
  );
}

function WhileCheck() {
  const [answer, setAnswer] = useState<string | null>(null);
  const options = ["0 1 2", "1 2 3", "3"];
  const correct = "1 2 3";

  return (
    <div className="arithmetic-check while-check">
      <div>
        <small>Короткая проверка</small>
        <strong>Что напечатает программа?</strong>
        <code>
          x = 0<br />
          while x &lt; 3:<br />
          &nbsp;&nbsp;&nbsp;&nbsp;x += 1<br />
          &nbsp;&nbsp;&nbsp;&nbsp;print(x)
        </code>
      </div>
      <div className="arithmetic-check-options">
        {options.map((option) => (
          <button
            className={`${answer === option ? "is-selected" : ""} ${
              answer && option === correct ? "is-correct" : ""
            }`}
            onClick={() => setAnswer(option)}
            key={option}
          >
            {option}
          </button>
        ))}
      </div>
      {answer && (
        <p className={answer === correct ? "is-correct" : ""}>
          {answer === correct
            ? "Верно: на каждом круге x сначала увеличивается, затем новое значение печатается."
            : "Проследи порядок строк: сначала x += 1, затем print(x)."}
        </p>
      )}
    </div>
  );
}

type ForDebugMode = "string" | "range";

function ForDebuggerGraphic({ mode }: { mode: ForDebugMode }) {
  const items = mode === "string" ? ["е", "г", "э"] : ["0", "1", "2", "3", "4"];
  const [phase, setPhase] = useState(0);
  const phasesPerItem = 3;
  const totalPhases = 1 + items.length * phasesPerItem + 1;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase((current) => (current + 1) % totalPhases);
    }, 900);
    return () => window.clearInterval(timer);
  }, [totalPhases]);

  const normalized = Math.max(0, phase - 1);
  const itemIndex = Math.min(items.length - 1, Math.floor(normalized / phasesPerItem));
  const itemPhase = normalized % phasesPerItem;
  const isStart = phase === 0;
  const isDone = phase === totalPhases - 1;
  const activeNode = isStart ? "source" : isDone ? "done" : ["check", "assign", "print"][itemPhase];
  const printedCount = isStart
    ? 0
    : isDone
      ? items.length
      : itemIndex + (itemPhase === 2 ? 1 : 0);
  const activeLine = isStart ? 1 : itemPhase === 2 ? 3 : 2;
  const variableName = mode === "string" ? "letter" : "i";
  const source = mode === "string" ? '"егэ"' : "range(5)";

  return (
    <div className="for-debugger" aria-label="Автоматическая трассировка цикла for">
      <div className="for-debugger-head">
        <div>
          <small>Режим отладки</small>
          <strong>
            {mode === "string" ? "Python берёт символы по одному" : "range передаёт числа по одному"}
          </strong>
        </div>
        <span>{isDone ? "Перебор завершён" : `Шаг ${Math.min(itemIndex + 1, items.length)}`}</span>
      </div>

      <div className="for-debugger-grid">
        <EditorFrame file={mode === "string" ? "letters.py" : "numbers.py"} className="for-code">
          <pre>
            <code>
              <span className={activeLine === 1 ? "is-active" : ""}>
                <i>1</i>{mode === "string" ? 'word = "егэ"' : ""}
              </span>
              <span className={activeLine === 2 ? "is-active" : ""}>
                <i>{mode === "string" ? "2" : "1"}</i>
                <b>for</b> {variableName} <b>in</b> {mode === "string" ? "word" : "range(5)"}:
              </span>
              <span className={activeLine === 3 ? "is-active is-indented" : "is-indented"}>
                <i>{mode === "string" ? "3" : "2"}</i>print({variableName})
              </span>
            </code>
          </pre>
        </EditorFrame>

        <div className="for-flow">
          <div className={`for-source ${activeNode === "source" ? "is-active" : ""}`}>
            <small>Последовательность {source}</small>
            <div>
              {items.map((item, index) => (
                <span
                  className={`${index === itemIndex && !isStart && !isDone ? "is-current" : ""} ${
                    index < printedCount ? "is-used" : ""
                  }`}
                  key={`${mode}-${item}-${index}`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className={`for-decision ${activeNode === "check" ? "is-active" : ""}`}>
            <span>Есть следующий элемент?</span>
          </div>
          <div className="for-flow-branches">
            <span className={activeNode === "assign" || activeNode === "print" ? "is-active" : ""}>
              Да · True
            </span>
            <span className={activeNode === "done" ? "is-active" : ""}>Нет · False</span>
          </div>
          <div className="for-flow-actions">
            <div className={activeNode === "assign" ? "is-active" : ""}>
              <small>Текущий элемент</small>
              <strong>
                {variableName} = {isStart || isDone ? "—" : items[itemIndex]}
              </strong>
            </div>
            <div className={activeNode === "print" ? "is-active" : ""}>
              <small>Тело цикла</small>
              <strong>print({variableName})</strong>
            </div>
            <div className={activeNode === "done" ? "is-active" : ""}>
              <small>Элементы закончились</small>
              <strong>идём дальше</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="for-debugger-output">
        <small>Вывод</small>
        <div>
          {items.map((item, index) => (
            <span className={index < printedCount ? "is-visible" : ""} key={`output-${mode}-${index}`}>
              {item}
            </span>
          ))}
        </div>
        <p>
          {mode === "string"
            ? "Переменная letter существует для одного текущего символа и меняется на каждом круге."
            : "range(5) подготовил пять значений: от 0 до 4. Число 5 — граница, оно не входит."}
        </p>
      </div>
    </div>
  );
}

const rangeExamples = [
  { expression: "range(7)", result: ["0", "1", "2", "3", "4", "5", "6"], note: "Начало 0 и шаг 1 подставились автоматически." },
  { expression: "range(5, 9)", result: ["5", "6", "7", "8"], note: "Идём от 5 до 9, но саму 9 не берём." },
  { expression: "range(2, 10, 2)", result: ["2", "4", "6", "8"], note: "Шаг 2: после каждого числа прыгаем через одно." },
  { expression: "range(10, 5, -1)", result: ["10", "9", "8", "7", "6"], note: "Отрицательный шаг позволяет двигаться назад." },
];

function RangeAnatomyGraphic() {
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExampleIndex((current) => (current + 1) % rangeExamples.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, []);

  const example = rangeExamples[exampleIndex];

  return (
    <div className="range-anatomy" aria-label="Автоматическая инфографика аргументов range">
      <div className="range-formula">
        <small>Функция создаёт последовательность чисел</small>
        <strong>
          range(<i>от</i>, <i>до</i>, <i>шаг</i>)
        </strong>
        <div>
          <span><b>от</b> первое число</span>
          <span><b>до</b> граница не включается</span>
          <span><b>шаг</b> как меняется число</span>
        </div>
      </div>
      <div className="range-live-example" key={example.expression}>
        <code>{example.expression}</code>
        <span aria-hidden="true">→</span>
        <div>
          {example.result.map((number) => <i key={`${example.expression}-${number}`}>{number}</i>)}
        </div>
        <p>{example.note}</p>
      </div>
      <div className="range-rules">
        <span><b>1 аргумент</b> начало = 0, шаг = 1</span>
        <span><b>2 аргумента</b> шаг = 1</span>
        <span><b>3 аргумента</b> всё задаёшь сам</span>
      </div>
    </div>
  );
}

function ForWhileComparisonGraphic() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => (current + 1) % 10), 850);
    return () => window.clearInterval(timer);
  }, []);

  const value = Math.floor(step / 2);
  const isPrint = step % 2 === 1;
  const printed = Math.min(5, value + (isPrint ? 1 : 0));

  return (
    <div className="loop-comparison" aria-label="Сравнение одинакового перебора через for и while">
      <div className="loop-comparison-head">
        <div>
          <small>Одна задача · два инструмента</small>
          <strong>Напечатать числа от 0 до 4</strong>
        </div>
        <span>Сейчас: {isPrint ? `печатаем ${value}` : `готовим значение ${value}`}</span>
      </div>
      <div className="loop-comparison-grid">
        <div className="loop-compare-card is-for">
          <h4><code>for</code> сам берёт следующее значение</h4>
          <EditorFrame file="with_for.py">
            <pre><code>
              <span className={!isPrint ? "is-active" : ""}><i>1</i><b>for</b> i <b>in</b> range(5):</span>
              <span className={isPrint ? "is-active is-indented" : "is-indented"}><i>2</i>print(i)</span>
            </code></pre>
          </EditorFrame>
          <p>Выбирай, когда известны элементы или количество повторений.</p>
        </div>
        <div className="loop-compare-card is-while">
          <h4><code>while</code> требует управлять счётчиком вручную</h4>
          <EditorFrame file="with_while.py">
            <pre><code>
              <span className={step === 0 ? "is-active" : ""}><i>1</i>i = 0</span>
              <span className={!isPrint ? "is-active" : ""}><i>2</i><b>while</b> i &lt; 5:</span>
              <span className={isPrint ? "is-active is-indented" : "is-indented"}><i>3</i>print(i)</span>
              <span className={!isPrint && step > 0 ? "is-active is-indented" : "is-indented"}><i>4</i>i += 1</span>
            </code></pre>
          </EditorFrame>
          <p>Выбирай, когда повторение должно продолжаться до изменения условия.</p>
        </div>
      </div>
      <div className="loop-shared-output">
        <small>Одинаковый вывод</small>
        {["0", "1", "2", "3", "4"].map((number, index) => (
          <span className={index < printed ? "is-visible" : ""} key={number}>{number}</span>
        ))}
      </div>
      <aside>
        <strong>Главное отличие</strong>
        <p><code>for</code> отвечает на вопрос «для каждого элемента что сделать?», а <code>while</code> — «пока условие истинно, что повторять?»</p>
      </aside>
    </div>
  );
}

function ForTheoryChapter({
  completed,
  progress,
  onComplete,
  onGoTo,
  onReplay,
}: {
  completed: Set<ForTheoryLessonId>;
  progress: number;
  onComplete: (id: ForTheoryLessonId) => void;
  onGoTo: (id: ForTheoryLessonId, delay?: number) => void;
  onReplay: () => void;
}) {
  return (
    <div className="theory-document theory-chapter-one theory-chapter-for">
      <div className="theory-document-title">
        <p className="eyebrow">Глава 6 · Перебор и диапазоны</p>
        <h2>Цикл for</h2>
        <p>Научимся брать элементы по одному, проследим цикл в режиме отладки и разберём, где заканчивается <code>range</code>.</p>
        <div className="theory-document-meta">
          <span>Предисловие + 4 блока</span><span>≈ 25 минут</span><span>{completed.size}/4 пройдено</span>
        </div>
      </div>

      <nav className="theory-document-nav" aria-label="Содержание главы">
        <button onClick={() => document.getElementById("theory-for-intro")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <span>0</span>Зачем нужен for
        </button>
        {forTheoryLessonIds.map((id, index) => (
          <button onClick={() => onGoTo(id)} key={id}>
            <span>{completed.has(id) ? "✓" : index + 1}</span>{forTheoryLessonTitles[id]}
          </button>
        ))}
      </nav>

      <section className="theory-intro chapter-one-intro for-chapter-intro" id="theory-for-intro">
        <div className="theory-section-heading"><span>00</span><div><p className="eyebrow">Вступление из жизни</p><h3>Когда объекты уже стоят в очереди</h3></div></div>
        <div className="theory-prose">
          <p>Представь стопку карточек. На каждой написано одно слово, а тебе нужно прочитать их все. Ты берёшь первую карточку, выполняешь действие, откладываешь её и переходишь к следующей.</p>
          <p><code>for</code> работает именно так: <strong>берёт элементы последовательности по одному</strong> и на время записывает текущий элемент в переменную. Когда элементы заканчиваются, цикл сам останавливается.</p>
          <p>Поэтому <code>for</code> удобен, когда нужно перебрать буквы строки, элементы списка или заранее известный диапазон чисел. В отличие от <code>while</code>, здесь не нужно вручную менять счётчик и проверять границу.</p>
        </div>
        <aside className="theory-intro-insight">Читай конструкцию буквально: <code>for letter in word</code> — «для каждой буквы letter в слове word».</aside>
      </section>

      <article className="theory-lesson chapter-one-block" id="theory-for-iteration">
        <div className="theory-lesson-heading"><span>01</span><div><p className="eyebrow">Перебор строки</p><h3>Один круг — один элемент</h3></div></div>
        <div className="theory-prose">
          <p>В строке <code>for letter in word:</code> переменная <code>letter</code> не хранит всё слово. На каждой итерации в ней лежит только один текущий символ.</p>
          <p>Отступ показывает тело цикла. Поэтому <code>print(letter)</code> запускается отдельно для «е», затем для «г» и наконец для «э». После последнего символа Python автоматически выходит из цикла.</p>
        </div>
        <ForDebuggerGraphic mode="string" />
        <ForTheoryLessonStatus id="iteration" completed={completed.has("iteration")} onComplete={onComplete} />
      </article>

      <article className="theory-lesson chapter-one-block" id="theory-for-range">
        <div className="theory-lesson-heading"><span>02</span><div><p className="eyebrow">for и range — разные инструменты</p><h3>range создаёт числа, for их перебирает</h3></div></div>
        <div className="theory-prose">
          <p><code>for</code> — это цикл. <code>range()</code> — отдельная функция, которая описывает последовательность целых чисел. Они часто стоят рядом, но выполняют разные роли.</p>
          <p><code>range(5)</code> создаёт пять значений: <code>0, 1, 2, 3, 4</code>. Пятёрка здесь означает правую границу, а не последнее число. Само значение <code>5</code> в диапазон не входит.</p>
        </div>
        <ForDebuggerGraphic mode="range" />
        <ForTheoryLessonStatus id="range" completed={completed.has("range")} onComplete={onComplete} />
      </article>

      <article className="theory-lesson chapter-one-block" id="theory-for-step">
        <div className="theory-lesson-heading"><span>03</span><div><p className="eyebrow">Аргументы range</p><h3>Откуда, докуда и каким шагом</h3></div></div>
        <div className="theory-prose">
          <p>Полная форма выглядит так: <code>range(от, до, шаг)</code>. Начало входит в диапазон, граница «до» не входит, а шаг говорит, насколько менять число перед следующим кругом.</p>
          <p>Если указан один аргумент, Python начинает с нуля. Если два — использует шаг 1. Чтобы идти назад, шаг должен быть отрицательным, например <code>range(10, 5, -1)</code>.</p>
        </div>
        <RangeAnatomyGraphic />
        <aside className="theory-warning"><span>Граница всегда остаётся за дверью</span><p>В <code>range(2, 10, 2)</code> последнее число — 8. Следующим было бы 10, но это уже исключённая правая граница.</p></aside>
        <ForTheoryLessonStatus id="step" completed={completed.has("step")} onComplete={onComplete} />
      </article>

      <article className="theory-lesson chapter-one-block" id="theory-for-comparison">
        <div className="theory-lesson-heading"><span>04</span><div><p className="eyebrow">Выбор цикла</p><h3>for и while могут решить одну задачу по-разному</h3></div></div>
        <div className="theory-prose">
          <p>Если заранее известен набор элементов или количество повторений, обычно яснее использовать <code>for</code>. Он сам берёт следующий элемент и сам замечает конец последовательности.</p>
          <p><code>while</code> нужен, когда количество кругов заранее неизвестно и остановка зависит от меняющегося условия: например, «пока есть попытки» или «пока число больше нуля».</p>
        </div>
        <ForWhileComparisonGraphic />
        <ForTheoryLessonStatus id="comparison" completed={completed.has("comparison")} onComplete={onComplete} />
      </article>

      <section className={`theory-finish ${progress === 100 ? "is-ready" : ""}`} id="theory-for-finish">
        <div className="theory-finish-planet"><PlanetSphere progress={progress} variant={5} complete={progress === 100} /></div>
        <div>
          <p className="eyebrow">{progress === 100 ? "Глава пройдена" : "Продолжай маршрут"}</p>
          <h3>{progress === 100 ? "Планета заполнена" : `Пройдено ${progress}%`}</h3>
          <p>{progress === 100 ? "Теперь ты понимаешь механику for, устройство range и умеешь выбирать подходящий цикл." : "Заверши оставшиеся блоки, чтобы полностью заполнить планету."}</p>
          {progress === 100 ? <button onClick={onReplay}>Повторить главу</button> : (
            <button onClick={() => { const first = forTheoryLessonIds.find((id) => !completed.has(id)); if (first) onGoTo(first); }}>К непройденному блоку</button>
          )}
        </div>
      </section>
    </div>
  );
}

type MatchChoice = { id: string; label: string };
type MatchTarget = { id: string; label: string; correctChoiceId: string };

const operationMatchChoices: MatchChoice[] = [
  { id: "answer-36", label: "36" },
  { id: "answer-7", label: "7" },
  { id: "answer-5", label: "5" },
  { id: "answer-code42", label: "code42" },
];

const operationMatchTargets: MatchTarget[] = [
  { id: "result-1", label: "6 ** 2", correctChoiceId: "answer-36" },
  { id: "result-2", label: "47 // 6", correctChoiceId: "answer-7" },
  { id: "result-3", label: "47 % 6", correctChoiceId: "answer-5" },
  { id: "result-4", label: '"code" + "42"', correctChoiceId: "answer-code42" },
];

function MatchingExercise({
  title,
  description,
  choices,
  targets,
  onPassedChange,
}: {
  title: string;
  description: string;
  choices: MatchChoice[];
  targets: MatchTarget[];
  onPassedChange: (passed: boolean) => void;
}) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [result, setResult] = useState<number | null>(null);

  const placeChoice = (targetId: string, choiceId: string) => {
    setPlacements((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([, placedChoice]) => placedChoice !== choiceId),
      );
      next[targetId] = choiceId;
      return next;
    });
    setSelectedChoice(null);
    setResult(null);
    onPassedChange(false);
  };

  const check = () => {
    const score = targets.reduce(
      (total, target) => total + (placements[target.id] === target.correctChoiceId ? 1 : 0),
      0,
    );
    setResult(score);
    onPassedChange(score === targets.length);
  };

  const reset = () => {
    setPlacements({});
    setSelectedChoice(null);
    setResult(null);
    onPassedChange(false);
  };

  const choiceLabel = (choiceId?: string) =>
    choices.find((choice) => choice.id === choiceId)?.label ?? "Перетащи сюда";

  return (
    <fieldset className="theory-match-question">
      <legend><span>1</span>{title}</legend>
      <p className="theory-match-instruction">{description}</p>

      <div className="theory-match-bank" aria-label="Варианты для перетаскивания">
        {choices.map((choice) => {
          const isSelected = selectedChoice === choice.id;
          const isUsed = Object.values(placements).includes(choice.id);
          return (
            <button
              type="button"
              draggable
              className={`${isSelected ? "is-selected" : ""} ${isUsed ? "is-used" : ""}`}
              aria-pressed={isSelected}
              onClick={() => setSelectedChoice(isSelected ? null : choice.id)}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", choice.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              key={choice.id}
            >
              {choice.label}
            </button>
          );
        })}
      </div>

      <div className="theory-match-targets">
        {targets.map((target) => {
          const placedChoice = placements[target.id];
          const checked = result !== null;
          const correct = checked && placedChoice === target.correctChoiceId;
          const wrong = checked && placedChoice !== target.correctChoiceId;
          return (
            <button
              type="button"
              className={`${placedChoice ? "has-choice" : ""} ${correct ? "is-correct" : ""} ${wrong ? "is-wrong" : ""}`}
              onClick={() => {
                if (selectedChoice) placeChoice(target.id, selectedChoice);
                else if (placedChoice) {
                  setPlacements((current) => {
                    const next = { ...current };
                    delete next[target.id];
                    return next;
                  });
                  setResult(null);
                  onPassedChange(false);
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const choiceId = event.dataTransfer.getData("text/plain");
                if (choices.some((choice) => choice.id === choiceId)) {
                  placeChoice(target.id, choiceId);
                }
              }}
              key={target.id}
            >
              <span>{target.label}</span>
              <strong>{choiceLabel(placedChoice)}</strong>
            </button>
          );
        })}
      </div>

      <div className="theory-match-footer">
        {result !== null && (
          <p className={result === targets.length ? "is-success" : ""}>
            {result === targets.length
              ? "Всё верно."
              : `Верно ${result} из ${targets.length}. Исправь выделенные ответы.`}
          </p>
        )}
        <button
          className="is-secondary"
          type="button"
          disabled={Object.keys(placements).length === 0}
          onClick={reset}
        >
          Сбросить всё
        </button>
        <button
          type="button"
          disabled={Object.keys(placements).length !== targets.length}
          onClick={check}
        >
          Проверить
        </button>
      </div>
    </fieldset>
  );
}

const firstPlanetQuestions = [
  {
    question: "Что выведет этот код?",
    code: "score = 9\nbonus = 4\nprint(score + bonus)",
    answers: ["13", "94", "Ошибка"],
    correct: 0,
  },
  {
    question: "Какой тип данных у значения temperature = -2.5?",
    answers: ["int", "float", "str"],
    correct: 1,
  },
  {
    question: "Чему равно 83 // 10?",
    answers: ["8", "8.3", "3"],
    correct: 0,
  },
  {
    question: "Чему равно 83 % 10?",
    answers: ["8", "3", "0"],
    correct: 1,
  },
  {
    question: "Что выведет print(\"exam\" + \"2026\")?",
    answers: ["exam2026", "exam + 2026", "Ошибка"],
    correct: 0,
  },
  {
    question: "Что произойдёт?",
    code: "number = \"7\"\nprint(number + 3)",
    answers: ["Получится 10", "Получится 73", "Возникнет TypeError"],
    correct: 2,
  },
] as const;

function FirstPlanetVideoChapter({
  complete,
  onComplete,
  onNext,
}: {
  complete: boolean;
  onComplete: () => void;
  onNext: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<number | null>(complete ? firstPlanetQuestions.length : null);
  const [matchPassed, setMatchPassed] = useState(complete);

  const requiredScore = 5;

  const checkTest = () => {
    const score = firstPlanetQuestions.reduce(
      (total, question, index) => total + (answers[index] === question.correct ? 1 : 0),
      0,
    );
    setResult(score);
    if (score >= requiredScore && matchPassed) onComplete();
  };

  const passed = complete || (result !== null && result >= requiredScore && matchPassed);

  return (
    <div className="theory-document theory-video-chapter">
      <div className="theory-document-title">
        <p className="eyebrow">Глава 1 · Основы Python</p>
        <h2>Переменные, типы данных, арифметические операции</h2>
        <p>
          Напишем первые команды, научимся хранить значения и разберём все арифметические
          операции, которые понадобятся дальше.
        </p>
        <div className="theory-document-meta">
          <span>Видео · конспект</span>
          <span>1 сопоставление</span>
          <span>6 вопросов</span>
          <span>{passed ? "Пройдено" : "Не пройдено"}</span>
        </div>
      </div>

      <section className="theory-video-section" aria-labelledby="first-planet-video-title">
        <div className="theory-section-heading">
          <span>01</span>
          <div>
            <p className="eyebrow">Видеоразбор</p>
            <h3 id="first-planet-video-title">Сначала посмотри занятие</h3>
          </div>
        </div>
        <div className="theory-youtube-frame">
          <iframe
            src="https://www.youtube.com/embed/OSL3TmvP54Y?si=4jcacgp4gGKoMhWE"
            title="Переменные, типы данных и арифметические операции"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </section>

      <article className="theory-notion-body">
        <h2>Короткий конспект</h2>
        <aside className="theory-notion-callout">
          <span aria-hidden="true">!</span>
          <p><strong>Главная привычка:</strong> перед вычислением спроси себя, какое значение и какого типа сейчас лежит в каждой переменной.</p>
        </aside>
        <hr />

        <h3>Ввод и вывод</h3>
        <p><code>print()</code> выводит информацию на экран. <code>input()</code> останавливает программу и ждёт, пока пользователь введёт значение.</p>
        <pre><code>{`print("Готово")\nname = input()`}</code></pre>

        <h3>Переменные</h3>
        <p>Переменная — это имя, за которым хранится значение. Python читает код сверху вниз, поэтому переменную нужно создать раньше, чем использовать.</p>
        <pre><code>{`score = 100\nprint(score + 20)`}</code></pre>
        <blockquote><code>=</code> — это присваивание: значение справа сохраняется в переменной слева.</blockquote>

        <h3>Типы данных</h3>
        <ul>
          <li><strong>int</strong> — целые числа: <code>7</code>, <code>-12</code>.</li>
          <li><strong>float</strong> — дробные числа: <code>2.5</code>, <code>-0.4</code>.</li>
          <li><strong>str</strong> — текст в кавычках: <code>"Python"</code>, <code>"10"</code>.</li>
        </ul>
        <p>Число <code>10</code> и строка <code>"10"</code> выглядят похоже, но Python работает с ними по-разному.</p>

        <hr />
        <h3>Арифметические операции</h3>
        <div className="theory-notion-table-wrap">
          <table>
            <thead><tr><th>Оператор</th><th>Что делает</th><th>Пример</th></tr></thead>
            <tbody>
              <tr><td><code>+</code> <code>-</code></td><td>сложение и вычитание</td><td><code>8 + 3</code></td></tr>
              <tr><td><code>*</code> <code>/</code></td><td>умножение и обычное деление</td><td><code>8 / 4 → 2.0</code></td></tr>
              <tr><td><code>**</code></td><td>возведение в степень</td><td><code>3 ** 2 → 9</code></td></tr>
              <tr><td><code>//</code></td><td>целая часть от деления</td><td><code>17 // 5 → 3</code></td></tr>
              <tr><td><code>%</code></td><td>остаток от деления</td><td><code>17 % 5 → 2</code></td></tr>
            </tbody>
          </table>
        </div>
        <aside className="theory-notion-callout">
          <span aria-hidden="true">i</span>
          <p>Оператор <code>/</code> возвращает <strong>float</strong>, даже если число делится без остатка. <code>//</code> оставляет целую часть, а <code>%</code> — остаток.</p>
        </aside>

        <h3>Строки, комментарии и ошибки</h3>
        <p>Знак <code>+</code> соединяет строки. Комментарий начинается с <code>#</code>: Python его пропускает, а человеку он помогает понять код.</p>
        <pre><code>{`message = "Python"  # название языка\nprint(message + "!")`}</code></pre>
        <blockquote><strong>Ошибка — это подсказка.</strong> <code>NameError</code> означает, что имя не найдено, а <code>TypeError</code> — что операция не подходит для этих типов.</blockquote>
      </article>

      <section className="theory-planet-test" id="first-planet-test">
        <div className="theory-section-heading">
          <span>05</span>
          <div>
            <p className="eyebrow">Небольшая проверка</p>
            <h3>Одно сопоставление и шесть вопросов</h3>
          </div>
        </div>
        <div className="theory-test-list">
          <MatchingExercise
            title="Соедини выражение и результат"
            description="Перетащи ответы или нажми на ответ, затем на нужную строку. Каждый ответ используется один раз."
            choices={operationMatchChoices}
            targets={operationMatchTargets}
            onPassedChange={setMatchPassed}
          />
          {firstPlanetQuestions.map((item, questionIndex) => (
            <fieldset key={item.question}>
              <legend><span>{questionIndex + 2}</span><span className="theory-question-text">{item.question}</span></legend>
              {"code" in item && item.code ? <TheoryPythonCode code={item.code} /> : null}
              {item.answers.map((answer, answerIndex) => {
                const isSelected = answers[questionIndex] === answerIndex;
                const isCorrect = result !== null && answerIndex === item.correct;
                const isWrong = result !== null && isSelected && answerIndex !== item.correct;
                return (
                  <label
                    className={`${isSelected ? "is-selected" : ""} ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}`}
                    key={answer}
                  >
                    <input
                      type="radio"
                      name={`first-planet-question-${questionIndex}`}
                      checked={isSelected}
                      disabled={passed}
                      onChange={() => {
                        setAnswers((current) => ({ ...current, [questionIndex]: answerIndex }));
                        setResult(null);
                      }}
                    />
                    <span>{answer}</span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
        <div className={`theory-test-result ${passed ? "is-passed" : ""}`}>
          {result !== null && (
            <p>{passed ? `Готово: ${result} из ${firstPlanetQuestions.length}. Планета пройдена.` : !matchPassed ? "Сначала заверши сопоставление выше." : `Пока ${result} из ${firstPlanetQuestions.length}. Нужно минимум ${requiredScore}.`}</p>
          )}
          {passed ? (
            <button onClick={onNext}>Перейти к следующей планете <span>→</span></button>
          ) : (
            <button disabled={!matchPassed || Object.keys(answers).length !== firstPlanetQuestions.length} onClick={checkTest}>
              Проверить ответы
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

const secondPlanetQuestions = [
  {
    question: "Что выведет программа, если ввести 20?",
    code: `age = int(input())\nif age >= 18:\n    print("Проход разрешён")\nelse:\n    print("Нужно подрасти")`,
    answers: ["Проход разрешён", "Нужно подрасти", "Ошибка"],
    correct: 0,
  },
  {
    question: "Что вернёт это сравнение?",
    code: "7 == 7",
    answers: ["True", "False", "7"],
    correct: 0,
  },
  {
    question: "При каком значении x условие истинно?",
    code: "x > 15 and x < 20",
    answers: ["12", "18", "22"],
    correct: 1,
  },
  {
    question: "Что выведет код?",
    code: `x = 10\nif x > 18:\n    print("A")\nelse:\n    print("B")\nprint("C")`,
    answers: ["Только B", "B, затем C", "Только C"],
    correct: 1,
  },
  {
    question: "Как записать проверку «x не больше 20»?",
    code: "# Выбери равносильное условие",
    answers: ["x > 20", "x <= 20", "x == 20"],
    correct: 1,
  },
  {
    question: "Что произойдёт после ввода числа 17?",
    code: `age = input()\nif age >= 18:\n    print("Можно")`,
    answers: ["Выведется «Можно»", "Ничего не выведется", "Возникнет TypeError"],
    correct: 2,
  },
] as const;

function SecondPlanetVideoChapter({
  complete,
  onComplete,
  onNext,
}: {
  complete: boolean;
  onComplete: () => void;
  onNext: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<number | null>(complete ? secondPlanetQuestions.length : null);
  const requiredScore = 5;
  const passed = complete || (result !== null && result >= requiredScore);

  const checkTest = () => {
    const score = secondPlanetQuestions.reduce(
      (total, question, index) => total + (answers[index] === question.correct ? 1 : 0),
      0,
    );
    setResult(score);
    if (score >= requiredScore) onComplete();
  };

  return (
    <div className="theory-document theory-video-chapter">
      <div className="theory-document-title">
        <p className="eyebrow">Глава 2 · Условия</p>
        <h2>Условные конструкции</h2>
        <p>Научим программу сравнивать значения, выбирать нужную ветку и правильно читать отступы.</p>
        <div className="theory-document-meta">
          <span>Видео · конспект</span>
          <span>Текстовая версия</span>
          <span>6 вопросов</span>
          <span>{passed ? "Пройдено" : "Не пройдено"}</span>
        </div>
      </div>

      <section className="theory-video-section" aria-labelledby="second-planet-video-title">
        <div className="theory-section-heading">
          <span>01</span>
          <div><p className="eyebrow">Видеоразбор</p><h3 id="second-planet-video-title">Сначала посмотри занятие</h3></div>
        </div>
        <div className="theory-youtube-frame">
          <iframe
            src="https://www.youtube.com/embed/ZbUNqBxVB_c?si=5xf5LwY1G2EJZe0q"
            title="Условия в Python"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </section>

      <article className="theory-notion-body">
        <h2>Короткий конспект</h2>
        <aside className="theory-notion-callout"><span aria-hidden="true">!</span><p><strong>Главное:</strong> <code>input()</code> всегда возвращает строку, а команды внутри <code>if</code> определяются отступом.</p></aside>

        <h3>Преобразование типов</h3>
        <p><code>int()</code> превращает подходящую строку в целое число, а <code>str()</code> — значение в строку. Без преобразования число и строку складывать нельзя.</p>
        <TheoryPythonCode code={`age = int(input())\nprint(age + 1)`} />

        <h3><code>if</code>, <code>else</code> и <code>elif</code></h3>
        <p><code>if</code> запускает блок, если условие истинно. <code>else</code> задаёт ветку для ложного условия. <code>elif</code> добавляет ещё одну проверку.</p>
        <TheoryPythonCode code={`age = int(input())\nif age >= 18:\n    print("Проход разрешён")\nelse:\n    print("Нужно подрасти")`} />

        <h3>Отступы задают границы ветки</h3>
        <p>Строки с четырьмя пробелами относятся к условию. Команда без отступа выполнится после всей конструкции независимо от выбранной ветки.</p>
        <TheoryPythonCode code={`if age >= 18:\n    print("Проход разрешён")\n    print("Приятной вечеринки")\nprint("Проверка завершена")`} />

        <h3>Сравнения и логические операторы</h3>
        <div className="theory-notion-table-wrap"><table><thead><tr><th>Запись</th><th>Смысл</th></tr></thead><tbody>
          <tr><td><code>==</code>, <code>!=</code></td><td>равно, не равно</td></tr>
          <tr><td><code>&gt;</code>, <code>&lt;</code></td><td>больше, меньше</td></tr>
          <tr><td><code>&gt;=</code>, <code>&lt;=</code></td><td>больше или равно, меньше или равно</td></tr>
          <tr><td><code>and</code></td><td>истинны обе части</td></tr>
          <tr><td><code>or</code></td><td>истинна хотя бы одна часть</td></tr>
          <tr><td><code>not</code></td><td>меняет результат на противоположный</td></tr>
        </tbody></table></div>

        <hr />
        <h2>Текстовая версия занятия</h2>
        <p>Сначала вспомним типы данных. Значение <code>10</code> — число, а <code>"10"</code> — строка. Функция <code>int()</code> нужна, когда строку требуется использовать в вычислении; <code>str()</code> выполняет обратное преобразование.</p>
        <p>Ввод пользователя получают через <code>input()</code>. Он всегда приходит строкой, поэтому возраст для сравнения с числом нужно записать как <code>age = int(input())</code>.</p>
        <p>Конструкция <code>if</code> проверяет условие. Если оно истинно, выполняется блок с отступом. Ветка <code>else</code> срабатывает в противоположном случае. Условия можно вкладывать друг в друга, но важно следить, к какому уровню относится каждая строка.</p>
        <p>Оператор <code>and</code> требует истинности обеих проверок, <code>or</code> — хотя бы одной, а <code>not</code> отрицает результат. Эти связки позволяют точно описать правила, по которым программа принимает решение.</p>
      </article>

      <section className="theory-planet-test" id="second-planet-test">
        <div className="theory-section-heading"><span>05</span><div><p className="eyebrow">Проверка</p><h3>Шесть вопросов по уроку</h3></div></div>
        <div className="theory-test-list">
          {secondPlanetQuestions.map((item, questionIndex) => (
            <fieldset key={item.question}>
              <legend><span>{questionIndex + 1}</span><span className="theory-question-text">{item.question}</span></legend>
              <TheoryPythonCode code={item.code} />
              {item.answers.map((answer, answerIndex) => {
                const isSelected = answers[questionIndex] === answerIndex;
                const isCorrect = result !== null && answerIndex === item.correct;
                const isWrong = result !== null && isSelected && answerIndex !== item.correct;
                return <label className={`${isSelected ? "is-selected" : ""} ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}`} key={answer}>
                  <input type="radio" name={`second-planet-question-${questionIndex}`} checked={isSelected} disabled={passed} onChange={() => { setAnswers((current) => ({ ...current, [questionIndex]: answerIndex })); setResult(null); }} />
                  <span>{answer}</span>
                </label>;
              })}
            </fieldset>
          ))}
        </div>
        <div className={`theory-test-result ${passed ? "is-passed" : ""}`}>
          {result !== null && <p>{passed ? `Готово: ${result} из ${secondPlanetQuestions.length}. Планета пройдена.` : `Пока ${result} из ${secondPlanetQuestions.length}. Нужно минимум ${requiredScore}.`}</p>}
          {passed ? <button onClick={onNext}>Перейти к следующей планете <span>→</span></button> : <button disabled={Object.keys(answers).length !== secondPlanetQuestions.length} onClick={checkTest}>Проверить ответы</button>}
        </div>
      </section>
    </div>
  );
}

function UnreleasedPlanetChapter({ planet }: { planet: Planet }) {
  return (
    <div className="theory-document theory-unreleased-chapter">
      <div className="theory-document-title">
        <p className="eyebrow">{planet.chapter}</p>
        <h2>{planet.title}</h2>
        <p>{planet.description}</p>
      </div>
      <section>
        <span aria-hidden="true">{String(planet.id + 1).padStart(2, "0")}</span>
        <h3>Материалы появятся здесь</h3>
        <p>После монтажа видео в этой главе будут занятие, конспект, текстовая версия и тест.</p>
      </section>
    </div>
  );
}

export default function TheorySpace({ accessToken, userId }: TheorySpaceProps) {
  const firstPlanetStorageKey = `egege-theory-video-planet-1-v1:${userId}`;
  const storageKey = `egege-theory-progress-v2:${userId}`;
  const arithmeticStorageKey = `egege-theory-arithmetic-v1:${userId}`;
  const conditionStorageKey = `egege-theory-conditions-v1:${userId}`;
  const stringTheoryStorageKey = `egege-theory-strings-v1:${userId}`;
  const whileTheoryStorageKey = `egege-theory-while-v1:${userId}`;
  const forTheoryStorageKey = `egege-theory-for-v1:${userId}`;
  const splitStorageKey = `egege-theory-split-v1:${userId}`;
  const theorySpaceRef = useRef<HTMLElement | null>(null);
  const theoryMapRef = useRef<HTMLDivElement | null>(null);
  const hasPositionedMapRef = useRef(false);
  const splitPercentRef = useRef(41);
  const closeChapterTimerRef = useRef<number | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<number | null>(null);
  const [chapterReady, setChapterReady] = useState(false);
  const [splitPercent, setSplitPercent] = useState(41);
  const [isResizing, setIsResizing] = useState(false);
  const [futurePreviewOpen, setFuturePreviewOpen] = useState(false);
  const [futureInterestCount, setFutureInterestCount] = useState<number | null>(null);
  const [futureInterestWaiting, setFutureInterestWaiting] = useState(false);
  const [futureInterestLoading, setFutureInterestLoading] = useState(false);
  const [futureInterestError, setFutureInterestError] = useState("");
  const [pendingPlanetId, setPendingPlanetId] = useState<number | null>(null);
  const [firstPlanetComplete, setFirstPlanetComplete] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<LessonId>>(() => new Set());
  const [completedArithmeticLessons, setCompletedArithmeticLessons] = useState<
    Set<ArithmeticLessonId>
  >(() => new Set());
  const [completedConditionLessons, setCompletedConditionLessons] = useState<
    Set<ConditionLessonId>
  >(() => new Set());
  const [completedStringTheoryLessons, setCompletedStringTheoryLessons] = useState<
    Set<StringTheoryLessonId>
  >(() => new Set());
  const [completedWhileTheoryLessons, setCompletedWhileTheoryLessons] = useState<
    Set<WhileTheoryLessonId>
  >(() => new Set());
  const [completedForTheoryLessons, setCompletedForTheoryLessons] = useState<
    Set<ForTheoryLessonId>
  >(() => new Set());

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setFirstPlanetComplete(window.localStorage.getItem(firstPlanetStorageKey) === "complete");
      } catch {
        setFirstPlanetComplete(false);
      }
    });
  }, [firstPlanetStorageKey]);

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
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(
          window.localStorage.getItem(arithmeticStorageKey) ?? "[]",
        ) as string[];
        setCompletedArithmeticLessons(
          new Set(
            saved.filter((item): item is ArithmeticLessonId =>
              arithmeticLessonIds.includes(item as ArithmeticLessonId),
            ),
          ),
        );
      } catch {
        setCompletedArithmeticLessons(new Set());
      }
    });
  }, [arithmeticStorageKey]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(
          window.localStorage.getItem(conditionStorageKey) ?? "[]",
        ) as string[];
        setCompletedConditionLessons(
          new Set(
            saved.filter((item): item is ConditionLessonId =>
              conditionLessonIds.includes(item as ConditionLessonId),
            ),
          ),
        );
      } catch {
        setCompletedConditionLessons(new Set());
      }
    });
  }, [conditionStorageKey]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(
          window.localStorage.getItem(stringTheoryStorageKey) ?? "[]",
        ) as string[];
        setCompletedStringTheoryLessons(
          new Set(
            saved.filter((item): item is StringTheoryLessonId =>
              stringTheoryLessonIds.includes(item as StringTheoryLessonId),
            ),
          ),
        );
      } catch {
        setCompletedStringTheoryLessons(new Set());
      }
    });
  }, [stringTheoryStorageKey]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(
          window.localStorage.getItem(whileTheoryStorageKey) ?? "[]",
        ) as string[];
        setCompletedWhileTheoryLessons(
          new Set(
            saved.filter((item): item is WhileTheoryLessonId =>
              whileTheoryLessonIds.includes(item as WhileTheoryLessonId),
            ),
          ),
        );
      } catch {
        setCompletedWhileTheoryLessons(new Set());
      }
    });
  }, [whileTheoryStorageKey]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(
          window.localStorage.getItem(forTheoryStorageKey) ?? "[]",
        ) as string[];
        setCompletedForTheoryLessons(
          new Set(
            saved.filter((item): item is ForTheoryLessonId =>
              forTheoryLessonIds.includes(item as ForTheoryLessonId),
            ),
          ),
        );
      } catch {
        setCompletedForTheoryLessons(new Set());
      }
    });
  }, [forTheoryStorageKey]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = Number(window.localStorage.getItem(splitStorageKey));
        if (Number.isFinite(saved) && saved >= 16 && saved <= 78) {
          splitPercentRef.current = saved;
          setSplitPercent(saved);
        }
      } catch {
        // The default split remains available.
      }
    });
  }, [splitStorageKey]);

  useEffect(() => {
    if (selectedPlanet === null) return;
    const frame = window.requestAnimationFrame(() => setChapterReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [selectedPlanet]);

  useEffect(() => {
    if (!futurePreviewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFuturePreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [futurePreviewOpen]);

  useEffect(() => {
    if (pendingPlanetId === null) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingPlanetId(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [pendingPlanetId]);

  useEffect(() => {
    return () => {
      if (closeChapterTimerRef.current) window.clearTimeout(closeChapterTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const map = theoryMapRef.current;
    if (!map || hasPositionedMapRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      map.scrollTop = map.scrollHeight;
      hasPositionedMapRef.current = true;
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const progress = firstPlanetComplete ? 100 : 0;
  const arithmeticProgress = completedArithmeticLessons.size * 25;
  const conditionProgress = completedConditionLessons.size * 20;
  const stringTheoryProgress = completedStringTheoryLessons.size * 25;
  const whileTheoryProgress = completedWhileTheoryLessons.size * 25;
  const forTheoryProgress = completedForTheoryLessons.size * 25;
  const getPlanetProgress = (planetId: number) => {
    if (planetId === 0) return progress;
    if (planetId === 1) return conditionProgress;
    if (planetId === 2) return whileTheoryProgress;
    if (planetId === 4) return stringTheoryProgress;
    if (planetId === 5) return forTheoryProgress;
    return 0;
  };
  const overallProgress = Math.round(
    planets.reduce((total, planet) => total + getPlanetProgress(planet.id), 0) / planets.length,
  );
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

  const goToArithmeticLesson = (lessonId: ArithmeticLessonId, delay = 0) => {
    window.setTimeout(() => {
      document.getElementById(`theory-arithmetic-${lessonId}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, delay);
  };

  const completeArithmeticLesson = (id: ArithmeticLessonId) => {
    const updated = new Set(completedArithmeticLessons);
    updated.add(id);
    setCompletedArithmeticLessons(updated);
    try {
      window.localStorage.setItem(arithmeticStorageKey, JSON.stringify(Array.from(updated)));
    } catch {
      // Progress remains available for the current session.
    }

    const currentIndex = arithmeticLessonIds.indexOf(id);
    const nextLesson = arithmeticLessonIds[currentIndex + 1];
    if (nextLesson) {
      goToArithmeticLesson(nextLesson, 160);
    } else {
      window.setTimeout(() => {
        document.getElementById("theory-arithmetic-finish")?.scrollIntoView({
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

  const replayArithmeticChapter = () => {
    setCompletedArithmeticLessons(new Set());
    try {
      window.localStorage.removeItem(arithmeticStorageKey);
    } catch {
      // The in-memory reset still works.
    }
    document.getElementById("theory-arithmetic-intro")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goToConditionLesson = (lessonId: ConditionLessonId, delay = 0) => {
    window.setTimeout(() => {
      document.getElementById(`theory-condition-${lessonId}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, delay);
  };

  const completeConditionLesson = (id: ConditionLessonId) => {
    const updated = new Set(completedConditionLessons);
    updated.add(id);
    setCompletedConditionLessons(updated);
    try {
      window.localStorage.setItem(conditionStorageKey, JSON.stringify(Array.from(updated)));
    } catch {
      // Progress remains available for the current session.
    }

    const currentIndex = conditionLessonIds.indexOf(id);
    const nextLesson = conditionLessonIds[currentIndex + 1];
    if (nextLesson) {
      goToConditionLesson(nextLesson, 160);
    } else {
      window.setTimeout(() => {
        document.getElementById("theory-condition-finish")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "center",
        });
      }, 160);
    }
  };

  const completeConditionChapter = () => {
    const updated = new Set<ConditionLessonId>(conditionLessonIds);
    setCompletedConditionLessons(updated);
    try {
      window.localStorage.setItem(conditionStorageKey, JSON.stringify(Array.from(updated)));
    } catch {
      // Progress remains available for the current session.
    }
  };

  const replayConditionChapter = () => {
    setCompletedConditionLessons(new Set());
    try {
      window.localStorage.removeItem(conditionStorageKey);
    } catch {
      // The in-memory reset still works.
    }
    document.getElementById("theory-condition-intro")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goToStringTheoryLesson = (lessonId: StringTheoryLessonId, delay = 0) => {
    window.setTimeout(() => {
      document.getElementById(`theory-strings-${lessonId}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, delay);
  };

  const completeStringTheoryLesson = (id: StringTheoryLessonId) => {
    const updated = new Set(completedStringTheoryLessons);
    updated.add(id);
    setCompletedStringTheoryLessons(updated);
    try {
      window.localStorage.setItem(stringTheoryStorageKey, JSON.stringify(Array.from(updated)));
    } catch {
      // Progress remains available for the current session.
    }

    const currentIndex = stringTheoryLessonIds.indexOf(id);
    const nextLesson = stringTheoryLessonIds[currentIndex + 1];
    if (nextLesson) {
      goToStringTheoryLesson(nextLesson, 160);
    } else {
      window.setTimeout(() => {
        document.getElementById("theory-strings-finish")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "center",
        });
      }, 160);
    }
  };

  const replayStringTheoryChapter = () => {
    setCompletedStringTheoryLessons(new Set());
    try {
      window.localStorage.removeItem(stringTheoryStorageKey);
    } catch {
      // The in-memory reset still works.
    }
    document.getElementById("theory-strings-intro")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goToWhileTheoryLesson = (lessonId: WhileTheoryLessonId, delay = 0) => {
    window.setTimeout(() => {
      document.getElementById(`theory-while-${lessonId}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, delay);
  };

  const completeWhileTheoryLesson = (id: WhileTheoryLessonId) => {
    const updated = new Set(completedWhileTheoryLessons);
    updated.add(id);
    setCompletedWhileTheoryLessons(updated);
    try {
      window.localStorage.setItem(whileTheoryStorageKey, JSON.stringify(Array.from(updated)));
    } catch {
      // Progress remains available for the current session.
    }

    const currentIndex = whileTheoryLessonIds.indexOf(id);
    const nextLesson = whileTheoryLessonIds[currentIndex + 1];
    if (nextLesson) {
      goToWhileTheoryLesson(nextLesson, 160);
    } else {
      window.setTimeout(() => {
        document.getElementById("theory-while-finish")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "center",
        });
      }, 160);
    }
  };

  const replayWhileTheoryChapter = () => {
    setCompletedWhileTheoryLessons(new Set());
    try {
      window.localStorage.removeItem(whileTheoryStorageKey);
    } catch {
      // The in-memory reset still works.
    }
    document.getElementById("theory-while-intro")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goToForTheoryLesson = (lessonId: ForTheoryLessonId, delay = 0) => {
    window.setTimeout(() => {
      document.getElementById(`theory-for-${lessonId}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }, delay);
  };

  const completeForTheoryLesson = (id: ForTheoryLessonId) => {
    const updated = new Set(completedForTheoryLessons);
    updated.add(id);
    setCompletedForTheoryLessons(updated);
    try {
      window.localStorage.setItem(forTheoryStorageKey, JSON.stringify(Array.from(updated)));
    } catch {
      // Progress remains available for the current session.
    }

    const currentIndex = forTheoryLessonIds.indexOf(id);
    const nextLesson = forTheoryLessonIds[currentIndex + 1];
    if (nextLesson) {
      goToForTheoryLesson(nextLesson, 160);
    } else {
      window.setTimeout(() => {
        document.getElementById("theory-for-finish")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "center",
        });
      }, 160);
    }
  };

  const replayForTheoryChapter = () => {
    setCompletedForTheoryLessons(new Set());
    try {
      window.localStorage.removeItem(forTheoryStorageKey);
    } catch {
      // The in-memory reset still works.
    }
    document.getElementById("theory-for-intro")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const scrollToFirstIncomplete = (completed = completedLessons) => {
    const firstIncomplete = lessonIds.find((lessonId) => !completed.has(lessonId));
    if (firstIncomplete) goToLesson(firstIncomplete, 360);
  };

  const completeFirstPlanet = () => {
    setFirstPlanetComplete(true);
    try {
      window.localStorage.setItem(firstPlanetStorageKey, "complete");
    } catch {
      // Progress remains available for the current session.
    }
  };

  const loadFutureInterest = async () => {
    setFutureInterestError("");
    try {
      const response = await fetch("/api/theory-interest", {
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
        cache: "no-store",
      });
      const payload = (await response.json()) as { count?: number; waiting?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Счётчик временно недоступен.");
      setFutureInterestCount(Number(payload.count ?? 0));
      setFutureInterestWaiting(Boolean(payload.waiting));
    } catch (error) {
      setFutureInterestError(error instanceof Error ? error.message : "Счётчик временно недоступен.");
    }
  };

  const openFuturePreview = () => {
    setFuturePreviewOpen(true);
    void loadFutureInterest();
  };

  const joinFutureInterest = async () => {
    if (futureInterestWaiting || futureInterestLoading) return;
    setFutureInterestLoading(true);
    setFutureInterestError("");
    try {
      const response = await fetch("/api/theory-interest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const payload = (await response.json()) as { count?: number; waiting?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Не удалось сохранить голос.");
      setFutureInterestCount(Number(payload.count ?? 0));
      setFutureInterestWaiting(Boolean(payload.waiting));
    } catch (error) {
      setFutureInterestError(error instanceof Error ? error.message : "Не удалось сохранить голос.");
    } finally {
      setFutureInterestLoading(false);
    }
  };

  const openPlanetNow = (planetId: number) => {
    if (closeChapterTimerRef.current) {
      window.clearTimeout(closeChapterTimerRef.current);
      closeChapterTimerRef.current = null;
    }
    if (selectedPlanet === null) setChapterReady(false);
    setSelectedPlanet(planetId);
    if (planetId === 0 && completedLessons.size > 0 && completedLessons.size < lessonIds.length) {
      scrollToFirstIncomplete();
    }
    if (
      planetId === 1 &&
      completedArithmeticLessons.size > 0 &&
      completedArithmeticLessons.size < arithmeticLessonIds.length
    ) {
      const firstIncomplete = arithmeticLessonIds.find(
        (lessonId) => !completedArithmeticLessons.has(lessonId),
      );
      if (firstIncomplete) goToArithmeticLesson(firstIncomplete, 360);
    }
    if (
      planetId === 2 &&
      completedConditionLessons.size > 0 &&
      completedConditionLessons.size < conditionLessonIds.length
    ) {
      const firstIncomplete = conditionLessonIds.find(
        (lessonId) => !completedConditionLessons.has(lessonId),
      );
      if (firstIncomplete) goToConditionLesson(firstIncomplete, 360);
    }
    if (
      planetId === 3 &&
      completedStringTheoryLessons.size > 0 &&
      completedStringTheoryLessons.size < stringTheoryLessonIds.length
    ) {
      const firstIncomplete = stringTheoryLessonIds.find(
        (lessonId) => !completedStringTheoryLessons.has(lessonId),
      );
      if (firstIncomplete) goToStringTheoryLesson(firstIncomplete, 360);
    }
    if (
      planetId === 4 &&
      completedWhileTheoryLessons.size > 0 &&
      completedWhileTheoryLessons.size < whileTheoryLessonIds.length
    ) {
      const firstIncomplete = whileTheoryLessonIds.find(
        (lessonId) => !completedWhileTheoryLessons.has(lessonId),
      );
      if (firstIncomplete) goToWhileTheoryLesson(firstIncomplete, 360);
    }
    if (
      planetId === 5 &&
      completedForTheoryLessons.size > 0 &&
      completedForTheoryLessons.size < forTheoryLessonIds.length
    ) {
      const firstIncomplete = forTheoryLessonIds.find(
        (lessonId) => !completedForTheoryLessons.has(lessonId),
      );
      if (firstIncomplete) goToForTheoryLesson(firstIncomplete, 360);
    }
  };

  const openPlanet = (planetId: number) => {
    const requiredPlanetId = planets.find(
      (planet) => getPlanetProgress(planet.id) < 100,
    )?.id;
    if (requiredPlanetId !== undefined && planetId > requiredPlanetId) {
      setPendingPlanetId(planetId);
      return;
    }
    openPlanetNow(planetId);
  };

  const closePlanet = () => {
    setChapterReady(false);
    closeChapterTimerRef.current = window.setTimeout(() => {
      setSelectedPlanet(null);
      closeChapterTimerRef.current = null;
    }, 300);
  };

  const updateSplitFromPointer = (clientX: number) => {
    const container = theorySpaceRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const minimumMapWidth = Math.min(220, bounds.width * 0.22);
    const minimumChapterWidth = Math.min(320, bounds.width * 0.36);
    const minimumPercent = Math.max(16, (minimumMapWidth / bounds.width) * 100);
    const maximumPercent = Math.min(78, 100 - (minimumChapterWidth / bounds.width) * 100);
    const next = Math.min(
      Math.max(((clientX - bounds.left) / bounds.width) * 100, minimumPercent),
      Math.max(minimumPercent, maximumPercent),
    );

    splitPercentRef.current = next;
    setSplitPercent(next);
  };

  const persistSplit = () => {
    setIsResizing(false);
    try {
      window.localStorage.setItem(splitStorageKey, String(splitPercentRef.current));
    } catch {
      // The chosen split remains available for the current session.
    }
  };

  const changeSplitWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let next = splitPercentRef.current;
    if (event.key === "ArrowLeft") next -= 1;
    else if (event.key === "ArrowRight") next += 1;
    else if (event.key === "Home") next = 16;
    else if (event.key === "End") next = 78;
    else return;

    event.preventDefault();
    next = Math.min(78, Math.max(16, next));
    splitPercentRef.current = next;
    setSplitPercent(next);
    try {
      window.localStorage.setItem(splitStorageKey, String(next));
    } catch {
      // The chosen split remains available for the current session.
    }
  };

  return (
    <section
      ref={theorySpaceRef}
      className={`theory-space ${activePlanet ? "is-chapter-open" : ""} ${
        chapterReady ? "is-chapter-ready" : ""
      } ${
        isResizing ? "is-resizing" : ""
      }`}
      style={
        {
          "--theory-map-width": `${splitPercent}%`,
        } as React.CSSProperties
      }
    >
      <div ref={theoryMapRef} className="theory-map">
        <div className="theory-stars" aria-hidden="true" />
        <header className="theory-map-header">
          <div>
            <p className="eyebrow">Учебная система</p>
            <h1>Космос знаний</h1>
          </div>
          <div className="theory-overall-progress">
            <span>{overallProgress}%</span>
            <small>девять глав</small>
          </div>
        </header>

        <div className="theory-route" aria-label="Главы теории">
          <span className="route-line route-line-one" aria-hidden="true" />
          <span className="route-line route-line-two" aria-hidden="true" />
          <span className="route-line route-line-three" aria-hidden="true" />
          <span className="route-line route-line-four" aria-hidden="true" />
          <span className="route-line route-line-five" aria-hidden="true" />
          <span className="route-line route-line-six" aria-hidden="true" />
          <span className="route-line route-line-seven" aria-hidden="true" />
          <span className="route-line route-line-eight" aria-hidden="true" />

          {planets.map((planet) => {
            const planetProgress = getPlanetProgress(planet.id);
            const routePlanet =
              selectedPlanet ??
              (planets.find((item) => getPlanetProgress(item.id) < 100)?.id ?? 8);
            return (
              <button
                className={`theory-planet theory-planet-${planet.id} ${
                  selectedPlanet === planet.id ? "is-selected" : ""
                } is-current`}
                onClick={() => openPlanet(planet.id)}
                aria-label={`${planet.chapter}. ${planet.title}. Пройдено ${planetProgress}%`}
                key={planet.id}
              >
                <span className="theory-planet-visual">
                  <PlanetSphere
                    progress={planetProgress}
                    variant={planet.id}
                    complete={planetProgress === 100}
                  />
                  {routePlanet === planet.id && <MascotRocket />}
                </span>
                <span className="theory-planet-label">
                  <small>{planet.chapter}</small>
                  <strong>{planet.title}</strong>
                  <i>{planetProgress}%</i>
                </span>
              </button>
            );
          })}

          <section className="theory-future-universe" aria-label="Следующая вселенная теории">
            <div className="future-universe-clouds" aria-hidden="true">
              <i /><i /><i /><i />
            </div>
            <span className="future-universe-path" aria-hidden="true" />
            <div className="future-locked-level future-locked-level-one" aria-hidden="true"><i>?</i></div>
            <div className="future-locked-level future-locked-level-two" aria-hidden="true"><i>?</i></div>
            <div className="future-locked-level future-locked-level-three" aria-hidden="true"><i>?</i></div>
            <p>Следующая вселенная</p>
            <button onClick={openFuturePreview} aria-label="Открыть превью следующей вселенной">
              <span>?</span>
              <small>Заглянуть за туманность</small>
            </button>
          </section>
        </div>

        <p className="theory-map-hint">
          Выберите планету, чтобы открыть главу. Для лучшего результата двигайтесь по порядку.
        </p>
      </div>

      {futurePreviewOpen && (
        <div
          className="future-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setFuturePreviewOpen(false);
          }}
        >
          <section
            className="future-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="future-preview-title"
          >
            <div className="future-preview-nebula" aria-hidden="true"><i /><i /><i /></div>
            <p className="eyebrow">Следующая вселенная · Скоро</p>
            <h2 id="future-preview-title">Теория к заданиям ЕГЭ</h2>
            <p>
              Сейчас ведётся активная разработка полноценной теории по заданиям ЕГЭ. Здесь
              появятся новые уровни, маршруты и закрытые пока планеты.
            </p>
            <div className="future-preview-levels" aria-hidden="true">
              <span><i>?</i><small>Уровень 10</small></span>
              <span><i>?</i><small>Уровень 11</small></span>
              <span><i>?</i><small>Дальше</small></span>
            </div>
            {futureInterestCount !== null && (
              <strong className="future-interest-count">
                Уже ждут: <span>{futureInterestCount}</span>
              </strong>
            )}
            {futureInterestError && <small className="future-interest-error">{futureInterestError}</small>}
            <button
              className={futureInterestWaiting ? "is-waiting" : ""}
              disabled={futureInterestWaiting || futureInterestLoading}
              onClick={joinFutureInterest}
            >
              {futureInterestLoading ? "СОХРАНЯЕМ…" : futureInterestWaiting ? "ЖДУ ✓" : "ЖДУ"}
            </button>
          </section>
        </div>
      )}

      {pendingPlanetId !== null && (() => {
        const requiredPlanet = planets.find(
          (planet) => getPlanetProgress(planet.id) < 100,
        ) ?? planets[0];
        const requestedPlanet = planets[pendingPlanetId];
        return (
          <div
            className="theory-order-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setPendingPlanetId(null);
            }}
          >
            <section
              className="theory-order-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="theory-order-title"
            >
              <p className="eyebrow">Похоже, ты перепрыгиваешь тему</p>
              <h2 id="theory-order-title">Сначала стоит пройти предыдущую планету</h2>
              <p>
                Ты ещё не завершил тему <strong>«{requiredPlanet.title}»</strong>. Она нужна,
                чтобы материал планеты <strong>«{requestedPlanet.title}»</strong> был понятнее.
              </p>
              <button
                className="theory-order-primary"
                onClick={() => {
                  setPendingPlanetId(null);
                  openPlanetNow(requiredPlanet.id);
                }}
              >
                Сначала пройти нужную тему
              </button>
              <button
                className="theory-order-secondary"
                onClick={() => {
                  const requestedId = pendingPlanetId;
                  setPendingPlanetId(null);
                  openPlanetNow(requestedId);
                }}
              >
                Всё равно открыть эту планету
              </button>
            </section>
          </div>
        );
      })()}

      {activePlanet && (
        <>
          <div
            className="theory-splitter"
            role="separator"
            aria-label="Изменить ширину карты и теории"
            aria-orientation="vertical"
            aria-valuemin={16}
            aria-valuemax={78}
            aria-valuenow={Math.round(splitPercent)}
            tabIndex={0}
            onKeyDown={changeSplitWithKeyboard}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setIsResizing(true);
              updateSplitFromPointer(event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                updateSplitFromPointer(event.clientX);
              }
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              persistSplit();
            }}
            onPointerCancel={persistSplit}
          >
            <span aria-hidden="true" />
          </div>
          <aside className="theory-chapter" aria-label={`Глава «${activePlanet.title}»`}>
          <header className="theory-chapter-header">
            <button
              className="theory-close"
              onClick={closePlanet}
              aria-label="Вернуться к карте"
            >
              <span aria-hidden="true">←</span>
              <span>К карте</span>
            </button>
            <div className="theory-chapter-progress">
              <span>
                <i
                  style={{
                    width: `${getPlanetProgress(activePlanet.id)}%`,
                  }}
                />
              </span>
              <small>{getPlanetProgress(activePlanet.id)}%</small>
            </div>
          </header>

          {activePlanet.id === 0 ? (
            <FirstPlanetVideoChapter
              complete={firstPlanetComplete}
              onComplete={completeFirstPlanet}
              onNext={() => openPlanet(1)}
            />
          ) : activePlanet.id === 1 ? (
            <SecondPlanetVideoChapter
              complete={conditionProgress === 100}
              onComplete={completeConditionChapter}
              onNext={() => openPlanet(2)}
            />
          ) : activePlanet.id === 5 ? (
            <ForTheoryChapter
              completed={completedForTheoryLessons}
              progress={forTheoryProgress}
              onComplete={completeForTheoryLesson}
              onGoTo={goToForTheoryLesson}
              onReplay={replayForTheoryChapter}
            />
          ) : activePlanet.id === 2 ? (
            <div className="theory-document theory-chapter-one theory-chapter-while">
              <div className="theory-document-title">
                <p className="eyebrow">Глава 5 · Управление повторениями</p>
                <h2>Цикл while</h2>
                <p>
                  Разберём цикл как маршрут, по которому программа ходит кругами: проверяет
                  условие, выполняет блок, возвращается назад и останавливается только после
                  первого результата <code>False</code>.
                </p>
                <div className="theory-document-meta">
                  <span>Предисловие + 4 блока</span>
                  <span>≈ 26 минут</span>
                  <span>{completedWhileTheoryLessons.size}/4 пройдено</span>
                </div>
              </div>

              <nav className="theory-document-nav" aria-label="Содержание главы">
                <button
                  onClick={() =>
                    document.getElementById("theory-while-intro")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  <span>0</span>
                  Зачем нужны циклы
                </button>
                {whileTheoryLessonIds.map((lessonId, index) => (
                  <button onClick={() => goToWhileTheoryLesson(lessonId)} key={lessonId}>
                    <span>{completedWhileTheoryLessons.has(lessonId) ? "✓" : index + 1}</span>
                    {whileTheoryLessonTitles[lessonId]}
                  </button>
                ))}
              </nav>

              <section
                className="theory-intro chapter-one-intro while-chapter-intro"
                id="theory-while-intro"
              >
                <div className="theory-section-heading">
                  <span>00</span>
                  <div>
                    <p className="eyebrow">Вступление из жизни</p>
                    <h3>Компьютер не устаёт повторять одно и то же</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Представь, что тебе нужно сто раз написать «Привет», проверить каждую букву
                    огромного текста или перебрать числа от 1 до 1000. Вручную каждое действие
                    простое, но вместе они отнимают часы и заставляют ошибаться.
                  </p>
                  <p>
                    Цикл позволяет один раз описать действие и сказать компьютеру:
                    <strong> «повторяй его, пока выполняется условие»</strong>. Сам код остаётся
                    коротким, а количество повторений может быть любым.
                  </p>
                  <p>
                    В этой главе мы не будем смешивать два разных инструмента. Здесь изучаем только
                    <code> while</code> — цикл, количество повторений которого определяется
                    условием. Циклу <code>for</code> будет посвящена следующая самостоятельная
                    планета.
                  </p>
                </div>
                <WhileEverydayGraphic />
                <aside className="theory-intro-insight">
                  Цикл — не команда «сделай много раз». Это команда «после каждого раза проверь,
                  нужно ли делать ещё один».
                </aside>
              </section>

              <article className="theory-lesson chapter-one-block" id="theory-while-idea">
                <div className="theory-lesson-heading">
                  <span>01</span>
                  <div>
                    <p className="eyebrow">Механика while</p>
                    <h3>Проверка → блок → снова проверка</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Слово <code>while</code> переводится как «пока». Запись
                    <code> while x &lt; 5:</code> читается так: «пока <code>x</code> меньше пяти,
                    выполняй вложенный блок».
                  </p>
                  <p>
                    Двоеточие открывает блок, а отступ показывает, какие команды относятся к
                    циклу. Python выполняет все строки блока сверху вниз, затем возвращается к
                    условию. Никакого автоматического изменения <code>x</code> нет: его обязан
                    изменить твой код.
                  </p>
                </div>
                <WhileFlowGraphic />
                <aside className="theory-warning">
                  <span>Условие проверяется раньше блока</span>
                  <p>
                    Если условие ложно уже при первой проверке, тело цикла не выполнится ни одного
                    раза. <code>while</code> не обязан запускаться хотя бы один раз.
                  </p>
                </aside>
                <WhileTheoryLessonStatus
                  id="idea"
                  completed={completedWhileTheoryLessons.has("idea")}
                  onComplete={completeWhileTheoryLesson}
                />
              </article>

              <article className="theory-lesson chapter-one-block" id="theory-while-trace">
                <div className="theory-lesson-heading">
                  <span>02</span>
                  <div>
                    <p className="eyebrow">Итерации</p>
                    <h3>Один полный круг называется итерацией</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Итерация — это одно полное выполнение тела цикла. Чтобы понять программу,
                    полезно не пытаться увидеть весь результат сразу, а выписывать состояние
                    переменной после каждого круга.
                  </p>
                  <p>
                    В примере ниже <code>x</code> начинается с нуля. Каждый круг сначала прибавляет
                    единицу, затем печатает новое значение. После печати программа не идёт дальше —
                    она возвращается к строке <code>while</code>.
                  </p>
                </div>
                <WhileDebuggerGraphic printInside />
                <WhileCheck />
                <WhileTheoryLessonStatus
                  id="trace"
                  completed={completedWhileTheoryLessons.has("trace")}
                  onComplete={completeWhileTheoryLesson}
                />
              </article>

              <article className="theory-lesson chapter-one-block" id="theory-while-indentation">
                <div className="theory-lesson-heading">
                  <span>03</span>
                  <div>
                    <p className="eyebrow">Граница тела цикла</p>
                    <h3>Отступ решает, что повторяется</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Самая важная мысль этой главы: <strong>цикл повторяет не все строки ниже, а
                    только строки с отступом</strong>. Как только Python встречает строку,
                    вернувшуюся к прежнему уровню, тело цикла закончилось.
                  </p>
                  <p>
                    Поэтому два почти одинаковых примера дают разный вывод. С отступом
                    <code> print(x)</code> срабатывает пять раз. Без отступа цикл только изменяет
                    <code> x</code>, а печать выполняется один раз после завершения цикла.
                  </p>
                </div>
                <WhileDebuggerGraphic printInside={false} />
                <WhileTheoryLessonStatus
                  id="indentation"
                  completed={completedWhileTheoryLessons.has("indentation")}
                  onComplete={completeWhileTheoryLesson}
                />
              </article>

              <article className="theory-lesson chapter-one-block" id="theory-while-infinite">
                <div className="theory-lesson-heading">
                  <span>04</span>
                  <div>
                    <p className="eyebrow">Остановка</p>
                    <h3>Цикл должен приближаться к False</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Перед запуском <code>while</code> задай себе два вопроса: какая переменная
                    участвует в условии и какая команда внутри цикла её изменяет? Если ответ на
                    второй вопрос — «никакая», цикл, скорее всего, никогда не закончится.
                  </p>
                  <p>
                    Бесконечный цикл не обязательно означает поломку Python. Программа честно
                    выполняет твою инструкцию: условие остаётся истинным, поэтому она снова и снова
                    проходит тот же маршрут.
                  </p>
                </div>
                <InfiniteWhileGraphic />
                <aside className="theory-intro-insight">
                  Полезная проверка перед запуском: выпиши несколько будущих значений переменной.
                  Если они не приближают условие к <code>False</code>, остановки не будет.
                </aside>
                <WhileTheoryLessonStatus
                  id="infinite"
                  completed={completedWhileTheoryLessons.has("infinite")}
                  onComplete={completeWhileTheoryLesson}
                />
              </article>

              <section
                className={`theory-finish ${whileTheoryProgress === 100 ? "is-ready" : ""}`}
                id="theory-while-finish"
              >
                <div className="theory-finish-planet">
                  <PlanetSphere
                    progress={whileTheoryProgress}
                    variant={4}
                    complete={whileTheoryProgress === 100}
                  />
                </div>
                <div>
                  <p className="eyebrow">
                    {whileTheoryProgress === 100 ? "Глава пройдена" : "Продолжай маршрут"}
                  </p>
                  <h3>
                    {whileTheoryProgress === 100
                      ? "Планета заполнена"
                      : `Пройдено ${whileTheoryProgress}%`}
                  </h3>
                  <p>
                    {whileTheoryProgress === 100
                      ? "Теперь ты умеешь прослеживать итерации while, видеть границы тела цикла и заранее замечать бесконечные повторения."
                      : "Заверши оставшиеся блоки, чтобы полностью заполнить планету."}
                  </p>
                  {whileTheoryProgress === 100 ? (
                    <button onClick={replayWhileTheoryChapter}>Повторить главу</button>
                  ) : (
                    <button
                      onClick={() => {
                        const firstIncomplete = whileTheoryLessonIds.find(
                          (lessonId) => !completedWhileTheoryLessons.has(lessonId),
                        );
                        if (firstIncomplete) goToWhileTheoryLesson(firstIncomplete);
                      }}
                    >
                      К непройденному блоку
                    </button>
                  )}
                </div>
              </section>
            </div>
          ) : activePlanet.id === 4 ? (
            <div className="theory-document theory-chapter-one theory-chapter-strings">
              <div className="theory-document-title">
                <p className="eyebrow">Глава 4 · Работа с последовательностями</p>
                <h2>Строки: индексация и срезы</h2>
                <p>
                  Научимся видеть текст глазами Python: находить символ по адресу, считать с конца
                  и аккуратно вырезать нужный фрагмент строки.
                </p>
                <div className="theory-document-meta">
                  <span>Предисловие + 4 блока</span>
                  <span>≈ 17 минут</span>
                  <span>{completedStringTheoryLessons.size}/4 пройдено</span>
                </div>
              </div>

              <nav className="theory-document-nav" aria-label="Содержание главы">
                <button
                  onClick={() =>
                    document.getElementById("theory-strings-intro")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  <span>0</span>
                  Текст глазами Python
                </button>
                {stringTheoryLessonIds.map((lessonId, index) => (
                  <button onClick={() => goToStringTheoryLesson(lessonId)} key={lessonId}>
                    <span>{completedStringTheoryLessons.has(lessonId) ? "✓" : index + 1}</span>
                    {stringTheoryLessonTitles[lessonId]}
                  </button>
                ))}
              </nav>

              <section
                className="theory-intro chapter-one-intro string-chapter-intro"
                id="theory-strings-intro"
              >
                <div className="theory-section-heading">
                  <span>00</span>
                  <div>
                    <p className="eyebrow">Вступление из жизни</p>
                    <h3>Текст — тоже упорядоченные данные</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Ты наверняка писал сообщение, в котором случайно забыл букву, переставил
                    символы или скопировал только часть текста. Каждый раз ты работал со строкой —
                    просто не думал об этом как программист.
                  </p>
                  <p>
                    <strong>Строка в Python — это последовательность символов.</strong> Каждый
                    символ занимает своё место и имеет номер — индекс. Программа видит текст как
                    аккуратную цепочку: символ за символом.
                  </p>
                </div>
                <aside className="theory-intro-insight">
                  Хорошо поймёшь строки — будет гораздо проще перейти к спискам. Индексы и срезы у
                  них устроены почти одинаково.
                </aside>
                <div className="theory-prose string-use-cases">
                  <p>В задачах ЕГЭ тебе понадобится:</p>
                  <ul className="subtask-list">
                    <li>проверять первый или последний символ строки;</li>
                    <li>искать и извлекать нужный фрагмент;</li>
                    <li>отсчитывать символы с конца;</li>
                    <li>перебирать строку по одному символу.</li>
                  </ul>
                </div>
              </section>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-strings-indexing"
              >
                <div className="theory-lesson-heading">
                  <span>01</span>
                  <div>
                    <p className="eyebrow">Строка как цепочка</p>
                    <h3>Первый символ имеет индекс 0</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Индекс — это адрес символа внутри строки. Счёт начинается не с единицы, а с
                    нуля: первый символ имеет индекс <code>0</code>, второй — <code>1</code> и так
                    далее.
                  </p>
                  <p>
                    Запись <code>s[индекс]</code> означает: «возьми один символ по этому адресу».
                    Квадратные скобки не изменяют строку — они только помогают обратиться к нужной
                    позиции. Пробелы, цифры и знаки препинания тоже считаются отдельными символами
                    и занимают свои позиции.
                  </p>
                  <p>
                    На схеме ниже сразу показаны две шкалы. Сверху идут обычные индексы слева
                    направо. Снизу — отрицательные индексы, которые считают символы с конца строки.
                    Пока сосредоточься на верхней шкале: отрицательные индексы подробно разберём в
                    следующем блоке.
                  </p>
                </div>
                <StringIndexGraphic />
                <StringIndexEditor />

                <div className="theory-subsection">
                  <p className="eyebrow">Если адреса нет</p>
                  <h4>Обычный индекс должен существовать</h4>
                  <p>
                    Python не может вернуть символ за пределами строки. Если индекс слишком
                    большой, программа остановится с ошибкой <code>IndexError</code>.
                  </p>
                </div>
                <IndexErrorGraphic />
                <StringTheoryLessonStatus
                  id="indexing"
                  completed={completedStringTheoryLessons.has("indexing")}
                  onComplete={completeStringTheoryLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-strings-negative"
              >
                <div className="theory-lesson-heading">
                  <span>02</span>
                  <div>
                    <p className="eyebrow">Отрицательные индексы</p>
                    <h3>С конца считаем от −1</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Иногда нужен последний символ, но длина строки заранее неизвестна. Тогда
                    удобно считать справа налево: <code>-1</code> — последний символ,
                    <code> -2</code> — предпоследний.
                  </p>
                </div>
                <NegativeIndexGraphic />
                <aside className="theory-warning">
                  <span>Запомни две опоры</span>
                  <p>
                    Первый символ — <code>s[0]</code>. Последний символ — <code>s[-1]</code>.
                    Эти две записи будут встречаться постоянно.
                  </p>
                </aside>
                <StringTheoryLessonStatus
                  id="negative"
                  completed={completedStringTheoryLessons.has("negative")}
                  onComplete={completeStringTheoryLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-strings-slices"
              >
                <div className="theory-lesson-heading">
                  <span>03</span>
                  <div>
                    <p className="eyebrow">Срезы</p>
                    <h3>Берём фрагмент от одной границы до другой</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Индекс возвращает один символ, а срез — новую строку из нескольких символов.
                    В срезе можно указать обе границы или оставить одну из них пустой. Разберём
                    каждый вариант отдельно, а уже потом соберём полную запись
                    <code> s[от:до]</code>.
                  </p>
                </div>
                <SliceBoundaryGraphic />

                <div className="theory-subsection">
                  <p className="eyebrow">Указали обе границы</p>
                  <h4>Теперь берём от одной позиции до другой</h4>
                  <p>
                    Когда написаны и начало, и конец, Python начинает с индекса
                    <code> от</code> и останавливается прямо перед индексом <code>до</code>.
                    Поэтому правая граница никогда не попадает в результат.
                  </p>
                </div>
                <SliceWindowGraphic />
                <aside className="theory-intro-insight string-slice-rule">
                  Левая граница включается. Правая — нет. Срез <code>s[3:7]</code> берёт индексы
                  <code> 3, 4, 5, 6</code> и останавливается перед индексом <code>7</code>.
                </aside>
                <SliceCodeEditor />
                <StringSliceCheck />
                <StringTheoryLessonStatus
                  id="slices"
                  completed={completedStringTheoryLessons.has("slices")}
                  onComplete={completeStringTheoryLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-strings-step"
              >
                <div className="theory-lesson-heading">
                  <span>04</span>
                  <div>
                    <p className="eyebrow">Шаг и пустые границы</p>
                    <h3>Можно брать каждый второй символ</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Третий параметр среза задаёт шаг: <code>s[от:до:шаг]</code>. Если начало или
                    конец не указаны, Python идёт от края строки.
                  </p>
                </div>
                <SliceStepGraphic />

                <div className="theory-subsection">
                  <p className="eyebrow">Строка не становится числом</p>
                  <h4>Кавычки меняют тип и поведение</h4>
                  <p>
                    Даже если строка выглядит как число, Python продолжает видеть текст.
                    Поэтому <code>&quot;3&quot; + &quot;4&quot;</code> соединяет символы, а
                    <code> 3 + 4</code> складывает числа.
                  </p>
                </div>
                <StringNumberGraphic />
                <StringTheoryLessonStatus
                  id="step"
                  completed={completedStringTheoryLessons.has("step")}
                  onComplete={completeStringTheoryLesson}
                />
              </article>

              <section
                className={`theory-finish ${stringTheoryProgress === 100 ? "is-ready" : ""}`}
                id="theory-strings-finish"
              >
                <div className="theory-finish-planet">
                  <PlanetSphere
                    progress={stringTheoryProgress}
                    variant={3}
                    complete={stringTheoryProgress === 100}
                  />
                </div>
                <div>
                  <p className="eyebrow">
                    {stringTheoryProgress === 100 ? "Глава пройдена" : "Продолжай маршрут"}
                  </p>
                  <h3>
                    {stringTheoryProgress === 100
                      ? "Планета заполнена"
                      : `Пройдено ${stringTheoryProgress}%`}
                  </h3>
                  <p>
                    {stringTheoryProgress === 100
                      ? "Теперь ты умеешь находить символы с двух сторон строки и собирать нужные фрагменты срезами."
                      : "Заверши оставшиеся блоки, чтобы полностью заполнить планету."}
                  </p>
                  {stringTheoryProgress === 100 ? (
                    <button onClick={replayStringTheoryChapter}>Повторить главу</button>
                  ) : (
                    <button
                      onClick={() => {
                        const firstIncomplete = stringTheoryLessonIds.find(
                          (lessonId) => !completedStringTheoryLessons.has(lessonId),
                        );
                        if (firstIncomplete) goToStringTheoryLesson(firstIncomplete);
                      }}
                    >
                      К непройденному блоку
                    </button>
                  )}
                </div>
              </section>
            </div>
          ) : activePlanet.id === 1 ? (
            <div className="theory-document theory-chapter-one theory-chapter-conditions">
              <div className="theory-document-title">
                <p className="eyebrow">Глава 3 · Выбор программы</p>
                <h2>Условные конструкции</h2>
                <p>
                  Научим программу принимать решения: проверять условия, выбирать одну из веток и
                  понимать, какие команды относятся к каждому блоку.
                </p>
                <div className="theory-document-meta">
                  <span>Предисловие + 5 блоков</span>
                  <span>≈ 22 минуты</span>
                  <span>{completedConditionLessons.size}/5 пройдено</span>
                </div>
              </div>

              <nav className="theory-document-nav" aria-label="Содержание главы">
                <button
                  onClick={() =>
                    document.getElementById("theory-condition-intro")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  <span>0</span>
                  Условия вокруг нас
                </button>
                {conditionLessonIds.map((lessonId, index) => (
                  <button onClick={() => goToConditionLesson(lessonId)} key={lessonId}>
                    <span>{completedConditionLessons.has(lessonId) ? "✓" : index + 1}</span>
                    {conditionLessonTitles[lessonId]}
                  </button>
                ))}
              </nav>

              <section
                className="theory-intro chapter-one-intro condition-chapter-intro"
                id="theory-condition-intro"
              >
                <div className="theory-section-heading">
                  <span>00</span>
                  <div>
                    <p className="eyebrow">Вступление из жизни</p>
                    <h3>Ты принимаешь решения каждый день</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Если идёт дождь — берёшь зонт. Если опаздываешь — ускоряешь шаг. Если
                    проголодался — идёшь есть. Ты сталкиваешься с условиями постоянно, даже не
                    замечая этого.
                  </p>
                  <p>
                    Программа рассуждает похожим образом: <strong>«если что-то произошло — сделай
                    это, иначе — сделай другое»</strong>. Разница лишь в том, что компьютеру нужно
                    записать проверку без намёков и двусмысленности.
                  </p>
                </div>
                <EverydayConditionsGraphic />
                <div className="theory-prose condition-use-cases">
                  <p>В задачах ЕГЭ условия помогают проверить:</p>
                  <ul className="subtask-list">
                    <li>делится ли число на другое;</li>
                    <li>чем заканчивается строка;</li>
                    <li>есть ли элемент внутри списка;</li>
                    <li>подходит ли значение под несколько правил.</li>
                  </ul>
                </div>
              </section>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-condition-branches"
              >
                <div className="theory-lesson-heading">
                  <span>01</span>
                  <div>
                    <p className="eyebrow">if, else и elif</p>
                    <h3>Проверка выбирает маршрут</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Команда <code>if</code> говорит: «если условие истинно — выполни вложенный
                    блок». Условие всегда даёт один из двух ответов: <code>True</code> или
                    <code> False</code>.
                  </p>
                </div>
                <IfFlowGraphic />

                <div className="theory-subsection">
                  <p className="eyebrow">А если условие ложно?</p>
                  <h4><code>else</code> задаёт запасной маршрут</h4>
                  <p>
                    Ветка <code>else</code> выполняется вместо <code>if</code>, когда проверка дала
                    <code> False</code>. Если вариантов больше двух, между ними добавляют
                    <code> elif</code> — сокращение от «else if».
                  </p>
                </div>
                <BranchChoiceGraphic />
                <aside className="theory-warning">
                  <span>Важно</span>
                  <p>
                    <code>elif</code> проверяется только тогда, когда все предыдущие условия в этой
                    цепочке оказались ложными.
                  </p>
                </aside>
                <ConditionLessonStatus
                  id="branches"
                  completed={completedConditionLessons.has("branches")}
                  onComplete={completeConditionLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-condition-chains"
              >
                <div className="theory-lesson-heading">
                  <span>02</span>
                  <div>
                    <p className="eyebrow">Независимые проверки</p>
                    <h3 className="condition-chain-title">
                      <span><code>if · if · if</code></span>
                      <em>или</em>
                      <span><code>if · elif · elif</code></span>
                    </h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Несколько отдельных <code>if</code> проверяются независимо, поэтому могут
                    сработать сразу несколько блоков. Цепочка <code>if–elif–else</code> выбирает
                    только первый подходящий вариант.
                  </p>
                </div>
                <IndependentChecksGraphic />
                <ConditionLessonStatus
                  id="chains"
                  completed={completedConditionLessons.has("chains")}
                  onComplete={completeConditionLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-condition-indentation"
              >
                <div className="theory-lesson-heading">
                  <span>03</span>
                  <div>
                    <p className="eyebrow">Самое важное в Python</p>
                    <h3>Отступ определяет границы блока</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    В Python нет фигурных скобок, которые показывают границы условия. Вместо них
                    используется отступ — обычно четыре пробела. Всё, что сдвинуто вправо на один
                    уровень, относится к соответствующей ветке.
                  </p>
                </div>
                <IndentationScopeGraphic />
                <IndentationCheck />

                <div className="theory-subsection">
                  <p className="eyebrow">Если забыть отступ</p>
                  <h4>Python сразу остановит программу</h4>
                  <p>
                    После строки с двоеточием Python ожидает вложенный блок. Если следующая команда
                    осталась слева, программа не может определить, что нужно выполнить внутри
                    условия.
                  </p>
                </div>
                <IndentationErrorGraphic />
                <aside className="theory-intro-insight">
                  Если отступа нет — программа покажет ошибку. Если отступ стоит не там — программа
                  может запуститься, но выполнить совсем не ту логику, которую ты задумал.
                </aside>
                <ConditionLessonStatus
                  id="indentation"
                  completed={completedConditionLessons.has("indentation")}
                  onComplete={completeConditionLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-condition-logic"
              >
                <div className="theory-lesson-heading">
                  <span>04</span>
                  <div>
                    <p className="eyebrow">Сравнения и логика</p>
                    <h3>Формулируем точный вопрос</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Внутри <code>if</code> обычно находится сравнение. Оно не изменяет значение, а
                    задаёт вопрос и возвращает <code>True</code> либо <code>False</code>.
                  </p>
                </div>
                <ComparisonOperatorsTable />

                <div className="theory-subsection">
                  <p className="eyebrow">Собираем несколько проверок</p>
                  <h4><code>and</code>, <code>or</code> и <code>not</code></h4>
                  <p>
                    <code>and</code> требует выполнения всех частей. <code>or</code> достаточно
                    хотя бы одной истинной части. <code>not</code> меняет ответ на
                    противоположный.
                  </p>
                </div>
                <BooleanLogicGraphic />
                <ConditionLessonStatus
                  id="logic"
                  completed={completedConditionLessons.has("logic")}
                  onComplete={completeConditionLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-condition-contains"
              >
                <div className="theory-lesson-heading">
                  <span>05</span>
                  <div>
                    <p className="eyebrow">Оператор in</p>
                    <h3>Есть ли объект внутри другого?</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Для строк оператор <code>in</code> отвечает на вопрос: «есть ли здесь символ
                    или целая подстрока?». Он также работает со списками и другими коллекциями.
                  </p>
                </div>
                <ContainsGraphic />

                <div className="theory-subsection">
                  <p className="eyebrow">Не наступай на эти грабли</p>
                  <h4>Две частые ошибки в условиях</h4>
                  <p>
                    Чаще всего в начале забывают отступ или пишут один знак <code>=</code> вместо
                    двух. Вспомни прошлую главу: один знак присваивает значение, а два сравнивают.
                  </p>
                </div>
                <ConditionErrorsGraphic />
                <ConditionLessonStatus
                  id="contains"
                  completed={completedConditionLessons.has("contains")}
                  onComplete={completeConditionLesson}
                />
              </article>

              <section
                className={`theory-finish ${conditionProgress === 100 ? "is-ready" : ""}`}
                id="theory-condition-finish"
              >
                <div className="theory-finish-planet">
                  <PlanetSphere
                    progress={conditionProgress}
                    variant={2}
                    complete={conditionProgress === 100}
                  />
                </div>
                <div>
                  <p className="eyebrow">
                    {conditionProgress === 100 ? "Глава пройдена" : "Продолжай маршрут"}
                  </p>
                  <h3>
                    {conditionProgress === 100
                      ? "Планета заполнена"
                      : `Пройдено ${conditionProgress}%`}
                  </h3>
                  <p>
                    {conditionProgress === 100
                      ? "Теперь ты умеешь строить ветвления, читать отступы и соединять несколько логических проверок."
                      : "Заверши оставшиеся блоки, чтобы полностью заполнить планету."}
                  </p>
                  {conditionProgress === 100 ? (
                    <button onClick={replayConditionChapter}>Повторить главу</button>
                  ) : (
                    <button
                      onClick={() => {
                        const firstIncomplete = conditionLessonIds.find(
                          (lessonId) => !completedConditionLessons.has(lessonId),
                        );
                        if (firstIncomplete) goToConditionLesson(firstIncomplete);
                      }}
                    >
                      К непройденному блоку
                    </button>
                  )}
                </div>
              </section>
            </div>
          ) : activePlanet.id === 3 || activePlanet.id >= 6 ? (
            <UnreleasedPlanetChapter planet={activePlanet} />
          ) : activePlanet.id === -1 ? (
            <div className="theory-document theory-chapter-one theory-chapter-arithmetic">
              <div className="theory-document-title">
                <p className="eyebrow">Глава 2 · Работа с данными</p>
                <h2>Арифметические операции</h2>
                <p>
                  Разберёмся, как Python считает числа, чем обычное деление отличается от
                  целочисленного и почему знак <code>+</code> по-разному работает с числами и
                  строками.
                </p>
                <div className="theory-document-meta">
                  <span>Предисловие + 4 блока</span>
                  <span>≈ 16 минут</span>
                  <span>{completedArithmeticLessons.size}/4 пройдено</span>
                </div>
              </div>

              <nav className="theory-document-nav" aria-label="Содержание главы">
                <button
                  onClick={() =>
                    document.getElementById("theory-arithmetic-intro")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  <span>0</span>
                  Зачем нужны операции
                </button>
                {arithmeticLessonIds.map((lessonId, index) => (
                  <button onClick={() => goToArithmeticLesson(lessonId)} key={lessonId}>
                    <span>{completedArithmeticLessons.has(lessonId) ? "✓" : index + 1}</span>
                    {arithmeticLessonTitles[lessonId]}
                  </button>
                ))}
              </nav>

              <section
                className="theory-intro chapter-one-intro arithmetic-chapter-intro"
                id="theory-arithmetic-intro"
              >
                <div className="theory-section-heading">
                  <span>00</span>
                  <div>
                    <p className="eyebrow">Вступление из жизни</p>
                    <h3>Данные тоже умеют взаимодействовать</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Представь калькулятор: вводишь <code>5</code> и <code>3</code>, нажимаешь
                    <code> +</code> и получаешь <code>8</code>. В Python с переменными можно делать
                    то же самое — складывать, вычитать, умножать, делить и сравнивать.
                  </p>
                  <p>
                    Но есть важная деталь: <strong>разные типы данных ведут себя по-разному</strong>.
                    Числа складываются, а две строки соединяются в одну.
                  </p>
                </div>
                <ArithmeticIntroGraphic />
              </section>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-arithmetic-basics"
              >
                <div className="theory-lesson-heading">
                  <span>01</span>
                  <div>
                    <p className="eyebrow">Операции с числами</p>
                    <h3>Знакомые знаки — точные команды</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Для базовых вычислений Python использует привычные математические операции.
                    Умножение записывается звёздочкой <code>*</code>, а степень — двумя
                    звёздочками <code>**</code>.
                  </p>
                </div>
                <ArithmeticOperationsTable />
                <aside className="theory-intro-insight">
                  Результат обычного деления <code>/</code> — дробное число типа
                  <code> float</code>, даже если деление получилось без остатка:
                  <code> 10 / 2 → 5.0</code>.
                </aside>
                <ArithmeticLessonStatus
                  id="basics"
                  completed={completedArithmeticLessons.has("basics")}
                  onComplete={completeArithmeticLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-arithmetic-division"
              >
                <div className="theory-lesson-heading">
                  <span>02</span>
                  <div>
                    <p className="eyebrow">Самые важные операции</p>
                    <h3>Целая часть <code>{"//"}</code> и остаток <code>%</code></h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Эти две операции встречаются почти в каждой большой теме ЕГЭ. Чтобы понять их,
                    достаточно вспомнить обычное деление столбиком.
                  </p>
                </div>
                <LongDivisionGraphic />

                <div className="theory-subsection">
                  <p className="eyebrow">В чём отличие</p>
                  <h4><code>/</code> делит, <code>{"//"}</code> берёт целую часть</h4>
                  <p>
                    Обычное деление сохраняет дробную часть: <code>19 / 5 → 3.8</code>.
                    Целочисленное деление возвращает количество целых пятёрок:
                    <code> 19 // 5 → 3</code>.
                  </p>
                </div>
                <DivisionCodeGraphic />
                <aside className="theory-warning arithmetic-division-warning">
                  <span>Запомни</span>
                  <p>
                    <code>{"//"}</code> не округляет число по математическому правилу. Для положительных
                    чисел оно просто оставляет целую часть результата деления.
                  </p>
                </aside>
                <ArithmeticLessonStatus
                  id="division"
                  completed={completedArithmeticLessons.has("division")}
                  onComplete={completeArithmeticLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-arithmetic-strings"
              >
                <div className="theory-lesson-heading">
                  <span>03</span>
                  <div>
                    <p className="eyebrow">Операции со строками</p>
                    <h3>Не сложение, а соединение</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Строки нельзя складывать как числа, но их можно соединять. Такое действие
                    называется <strong>конкатенацией</strong>.
                  </p>
                </div>
                <StringOperationsGraphic />

                <div className="theory-subsection">
                  <p className="eyebrow">Повторение строки</p>
                  <h4>Умножаем текст на число</h4>
                  <p>
                    Операция <code>*</code> повторяет строку указанное количество раз. Это короткая
                    и вполне буквальная команда.
                  </p>
                </div>
                <StringRepeatEditor />

                <div className="theory-subsection">
                  <p className="eyebrow">Несовместимые типы</p>
                  <h4>Строка <code>+</code> число не сработает</h4>
                  <p>
                    Python не будет угадывать, хочешь ты получить число <code>8</code> или строку
                    <code>&quot;53&quot;</code>. Поэтому такая операция заканчивается ошибкой.
                  </p>
                </div>
                <TypeMismatchGraphic />
                <ArithmeticCheck />
                <ArithmeticLessonStatus
                  id="strings"
                  completed={completedArithmeticLessons.has("strings")}
                  onComplete={completeArithmeticLesson}
                />
              </article>

              <article
                className="theory-lesson chapter-one-block"
                id="theory-arithmetic-shortcuts"
              >
                <div className="theory-lesson-heading">
                  <span>04</span>
                  <div>
                    <p className="eyebrow">Короткая запись</p>
                    <h3>Изменяем переменную и записываем обратно</h3>
                  </div>
                </div>
                <div className="theory-prose">
                  <p>
                    Часто новое значение переменной зависит от её текущего значения. Запись
                    <code> x = x - 1</code> читается так: взять текущее <code>x</code>, вычесть
                    единицу и связать имя <code>x</code> с новым результатом.
                  </p>
                </div>
                <ShortcutGraphic />

                <div className="theory-subsection">
                  <p className="eyebrow">Один принцип</p>
                  <h4>Сокращение работает с разными операциями</h4>
                  <p>
                    Сначала пишется знак нужной операции, затем <code>=</code>. Это только
                    сокращённая запись — результат будет тем же.
                  </p>
                </div>
                <ShortcutTable />
                <ArithmeticLessonStatus
                  id="shortcuts"
                  completed={completedArithmeticLessons.has("shortcuts")}
                  onComplete={completeArithmeticLesson}
                />
              </article>

              <section
                className={`theory-finish ${
                  arithmeticProgress === 100 ? "is-ready" : ""
                }`}
                id="theory-arithmetic-finish"
              >
                <div className="theory-finish-planet">
                  <PlanetSphere
                    progress={arithmeticProgress}
                    variant={1}
                    complete={arithmeticProgress === 100}
                  />
                </div>
                <div>
                  <p className="eyebrow">
                    {arithmeticProgress === 100 ? "Глава пройдена" : "Продолжай маршрут"}
                  </p>
                  <h3>
                    {arithmeticProgress === 100
                      ? "Планета заполнена"
                      : `Пройдено ${arithmeticProgress}%`}
                  </h3>
                  <p>
                    {arithmeticProgress === 100
                      ? "Теперь ты умеешь считать, работать с остатком, соединять строки и сокращать операции."
                      : "Заверши оставшиеся блоки, чтобы полностью заполнить планету."}
                  </p>
                  {arithmeticProgress === 100 ? (
                    <button onClick={replayArithmeticChapter}>Повторить главу</button>
                  ) : (
                    <button
                      onClick={() => {
                        const firstIncomplete = arithmeticLessonIds.find(
                          (lessonId) => !completedArithmeticLessons.has(lessonId),
                        );
                        if (firstIncomplete) goToArithmeticLesson(firstIncomplete);
                      }}
                    >
                      К непройденному блоку
                    </button>
                  )}
                </div>
              </section>
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
        </>
      )}
    </section>
  );
}
