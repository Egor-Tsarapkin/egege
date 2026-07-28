"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
    title: "Арифметические операции",
    description: "Как Python считает, делит и соединяет данные.",
  },
  {
    id: 2,
    chapter: "Глава 3",
    title: "Условные конструкции",
    description: "Как код сравнивает значения и выбирает маршрут.",
  },
  {
    id: 3,
    chapter: "Глава 4",
    title: "Строки: индексы и срезы",
    description: "Как находить символы и вырезать части текста.",
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
      {variant === 3 && (
        <span className="planet-string-pattern">
          <i>&quot;</i>
          <i>0</i>
          <i>:</i>
          <i>−1</i>
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
      <p>
        В слове «информатика» нет символа с индексом <code>20</code>. Обычный индекс обязан
        существовать.
      </p>
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
    ['"3" + "4"', '"34"', "строки соединяются"],
    ["3 + 4", "7", "числа складываются"],
    ['"3" * 2', '"33"', "строка повторяется"],
    ["3 * 2", "6", "числа умножаются"],
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
        {examples.map(([expression, result, label], index) => (
          <span className={index % 2 === 0 ? "is-string" : "is-number"} key={expression}>
            <code>{expression}</code>
            <i>→</i>
            <b>{result}</b>
            <small>{label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function StringSliceCheck() {
  const [answer, setAnswer] = useState<string | null>(null);
  const options = ["форм", "орма", "ормат"];

  return (
    <div className="arithmetic-check string-slice-check">
      <div>
        <small>Быстрая проверка</small>
        <strong>Что вернёт этот срез?</strong>
        <code>s = &quot;информатика&quot;<br />print(s[3:7])</code>
      </div>
      <div className="arithmetic-check-options">
        {options.map((option) => (
          <button
            className={`${answer === option ? "is-selected" : ""} ${
              answer && option === "орма" ? "is-correct" : ""
            }`}
            onClick={() => setAnswer(option)}
            key={option}
          >
            {option}
          </button>
        ))}
      </div>
      {answer && (
        <p className={answer === "орма" ? "is-correct" : ""}>
          {answer === "орма"
            ? "Верно: берём индексы 3, 4, 5 и 6. Символ с индексом 7 уже не входит."
            : "Проверь границы: начало входит, конец с индексом 7 — нет."}
        </p>
      )}
    </div>
  );
}

export default function TheorySpace({ userId }: TheorySpaceProps) {
  const storageKey = `egege-theory-progress-v2:${userId}`;
  const arithmeticStorageKey = `egege-theory-arithmetic-v1:${userId}`;
  const conditionStorageKey = `egege-theory-conditions-v1:${userId}`;
  const stringTheoryStorageKey = `egege-theory-strings-v1:${userId}`;
  const splitStorageKey = `egege-theory-split-v1:${userId}`;
  const theorySpaceRef = useRef<HTMLElement | null>(null);
  const splitPercentRef = useRef(41);
  const [selectedPlanet, setSelectedPlanet] = useState<number | null>(null);
  const [splitPercent, setSplitPercent] = useState(41);
  const [isResizing, setIsResizing] = useState(false);
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
        const saved = Number(window.localStorage.getItem(splitStorageKey));
        if (Number.isFinite(saved) && saved >= 24 && saved <= 60) {
          splitPercentRef.current = saved;
          setSplitPercent(saved);
        }
      } catch {
        // The default split remains available.
      }
    });
  }, [splitStorageKey]);

  const progress = completedLessons.size * 50;
  const arithmeticProgress = completedArithmeticLessons.size * 25;
  const conditionProgress = completedConditionLessons.size * 20;
  const stringTheoryProgress = completedStringTheoryLessons.size * 25;
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

  const scrollToFirstIncomplete = (completed = completedLessons) => {
    const firstIncomplete = lessonIds.find((lessonId) => !completed.has(lessonId));
    if (firstIncomplete) goToLesson(firstIncomplete, 360);
  };

  const openPlanet = (planetId: number) => {
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
  };

  const updateSplitFromPointer = (clientX: number) => {
    const container = theorySpaceRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();
    const minimumMapWidth = Math.min(280, bounds.width * 0.32);
    const minimumChapterWidth = Math.min(430, bounds.width * 0.48);
    const minimumPercent = Math.max(24, (minimumMapWidth / bounds.width) * 100);
    const maximumPercent = Math.min(60, 100 - (minimumChapterWidth / bounds.width) * 100);
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
    if (event.key === "ArrowLeft") next -= 2;
    else if (event.key === "ArrowRight") next += 2;
    else if (event.key === "Home") next = 24;
    else if (event.key === "End") next = 60;
    else return;

    event.preventDefault();
    next = Math.min(60, Math.max(24, next));
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
        isResizing ? "is-resizing" : ""
      }`}
      style={
        {
          "--theory-map-width": `${splitPercent}%`,
        } as React.CSSProperties
      }
    >
      <div className="theory-map">
        <div className="theory-stars" aria-hidden="true" />
        <header className="theory-map-header">
          <div>
            <p className="eyebrow">Учебная система</p>
            <h1>Космос знаний</h1>
          </div>
          <div className="theory-overall-progress">
            <span>
              {Math.round(
                (progress + arithmeticProgress + conditionProgress + stringTheoryProgress) / 4,
              )}%
            </span>
            <small>четыре главы</small>
          </div>
        </header>

        <div className="theory-route" aria-label="Главы теории">
          <span className="route-line route-line-one" aria-hidden="true" />
          <span className="route-line route-line-two" aria-hidden="true" />
          <span className="route-line route-line-three" aria-hidden="true" />

          {planets.map((planet) => {
            const planetProgress =
              planet.id === 0
                ? progress
                : planet.id === 1
                  ? arithmeticProgress
                  : planet.id === 2
                    ? conditionProgress
                    : stringTheoryProgress;
            const routePlanet =
              selectedPlanet ??
              (progress < 100
                ? 0
                : arithmeticProgress < 100
                  ? 1
                  : conditionProgress < 100
                    ? 2
                    : 3);
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
        </div>

        <p className="theory-map-hint">
          Выберите планету, чтобы открыть главу. Темы можно проходить в своём порядке.
        </p>
      </div>

      {activePlanet && (
        <>
          <div
            className="theory-splitter"
            role="separator"
            aria-label="Изменить ширину карты и теории"
            aria-orientation="vertical"
            aria-valuemin={24}
            aria-valuemax={60}
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
              onClick={() => setSelectedPlanet(null)}
              aria-label="Вернуться к карте"
            >
              <span aria-hidden="true">←</span>
              <span>К карте</span>
            </button>
            <div className="theory-chapter-progress">
              <span>
                <i
                  style={{
                    width: `${
                      activePlanet.id === 0
                        ? progress
                        : activePlanet.id === 1
                          ? arithmeticProgress
                          : activePlanet.id === 2
                            ? conditionProgress
                            : stringTheoryProgress
                    }%`,
                  }}
                />
              </span>
              <small>
                {activePlanet.id === 0
                  ? `${progress}%`
                  : activePlanet.id === 1
                    ? `${arithmeticProgress}%`
                    : activePlanet.id === 2
                      ? `${conditionProgress}%`
                      : `${stringTheoryProgress}%`}
              </small>
            </div>
          </header>

          {activePlanet.id === 3 ? (
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
                    Формат записи: <code>s[от:до]</code>.
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
          ) : activePlanet.id === 2 ? (
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
          ) : activePlanet.id === 1 ? (
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
