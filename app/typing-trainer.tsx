"use client";

import { Hand } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type TrainerMode = "python" | "russian" | "symbols";
type HandSide = "left" | "right";
type Finger = "little" | "ring" | "middle" | "index" | "thumb";

type KeyDefinition = {
  code: string;
  english: string;
  russian?: string;
  shifted?: string;
  width?: "medium" | "wide" | "space";
};

type FingerGuide = {
  finger: Finger;
  hand: HandSide;
  key: string;
};

type NextKey = {
  code: string;
  display: string;
  guides: FingerGuide[];
  highlightCodes: string[];
};

const BEST_KEY = "egege-typing-best-v1";

const MODE_OPTIONS: Array<{ id: TrainerMode; label: string }> = [
  { id: "python", label: "Python" },
  { id: "russian", label: "Русский" },
  { id: "symbols", label: "Символы" },
];

const EXERCISES: Record<TrainerMode, string[]> = {
  python: [
    `nums = [4, 7, 2, 9]
result = 0
for num in nums:
    if num % 2 == 0:
        result += num
print(result)`,
    `word = input()
vowels = 0
for letter in word:
    if letter in "aeiou":
        vowels += 1
print(vowels)`,
    `n = int(input())
total = 0
while n > 0:
    total += n % 10
    n //= 10
print(total)`,
    `def count_even(values):
    count = 0
    for value in values:
        if value % 2 == 0:
            count += 1
    return count

print(count_even([3, 6, 8, 11]))`,
    `numbers = list(map(int, input().split()))
maximum = numbers[0]
for number in numbers:
    if number > maximum:
        maximum = number
print(maximum)`,
    `text = input()
result = ""
for char in text:
    if char != " ":
        result += char
print(result)`,
  ],
  russian: [
    "Точный код начинается со спокойного ритма и правильной постановки рук.",
    "Сначала печатай без ошибок, а скорость обязательно появится следом.",
    "Короткая ежедневная тренировка помогает увереннее писать программы.",
    "Держи ровный темп: не торопись на сложных сочетаниях и следи за точностью.",
    "Хорошая привычка — смотреть на экран, а не искать каждую клавишу глазами.",
    "Несколько спокойных минут практики каждый день дают заметный результат.",
  ],
  symbols: [
    "() [] {} : ; == != += -= // **",
    "range(10): nums[i] += value",
    "print(f\"Ответ: {result}\")",
    "if (a <= b) and (b != 0):",
    "items[2:8] == values[::-1]",
    "{key: value for key, value in pairs}",
  ],
};

const KEYBOARD_ROWS: KeyDefinition[][] = [
  [
    { code: "Backquote", english: "`", russian: "ё", shifted: "~" },
    { code: "Digit1", english: "1", shifted: "!" },
    { code: "Digit2", english: "2", shifted: "@" },
    { code: "Digit3", english: "3", shifted: "#" },
    { code: "Digit4", english: "4", shifted: "$" },
    { code: "Digit5", english: "5", shifted: "%" },
    { code: "Digit6", english: "6", shifted: "^" },
    { code: "Digit7", english: "7", shifted: "&" },
    { code: "Digit8", english: "8", shifted: "*" },
    { code: "Digit9", english: "9", shifted: "(" },
    { code: "Digit0", english: "0", shifted: ")" },
    { code: "Minus", english: "-", shifted: "_" },
    { code: "Equal", english: "=", shifted: "+" },
    { code: "Backspace", english: "Backspace", width: "wide" },
  ],
  [
    { code: "Tab", english: "Tab", width: "medium" },
    { code: "KeyQ", english: "Q", russian: "Й" },
    { code: "KeyW", english: "W", russian: "Ц" },
    { code: "KeyE", english: "E", russian: "У" },
    { code: "KeyR", english: "R", russian: "К" },
    { code: "KeyT", english: "T", russian: "Е" },
    { code: "KeyY", english: "Y", russian: "Н" },
    { code: "KeyU", english: "U", russian: "Г" },
    { code: "KeyI", english: "I", russian: "Ш" },
    { code: "KeyO", english: "O", russian: "Щ" },
    { code: "KeyP", english: "P", russian: "З" },
    { code: "BracketLeft", english: "[", russian: "Х", shifted: "{" },
    { code: "BracketRight", english: "]", russian: "Ъ", shifted: "}" },
    { code: "Backslash", english: "\\", shifted: "|", width: "medium" },
  ],
  [
    { code: "CapsLock", english: "Caps", width: "wide" },
    { code: "KeyA", english: "A", russian: "Ф" },
    { code: "KeyS", english: "S", russian: "Ы" },
    { code: "KeyD", english: "D", russian: "В" },
    { code: "KeyF", english: "F", russian: "А" },
    { code: "KeyG", english: "G", russian: "П" },
    { code: "KeyH", english: "H", russian: "Р" },
    { code: "KeyJ", english: "J", russian: "О" },
    { code: "KeyK", english: "K", russian: "Л" },
    { code: "KeyL", english: "L", russian: "Д" },
    { code: "Semicolon", english: ";", russian: "Ж", shifted: ":" },
    { code: "Quote", english: "'", russian: "Э", shifted: "\"" },
    { code: "Enter", english: "Enter", width: "wide" },
  ],
  [
    { code: "ShiftLeft", english: "Shift", width: "wide" },
    { code: "KeyZ", english: "Z", russian: "Я" },
    { code: "KeyX", english: "X", russian: "Ч" },
    { code: "KeyC", english: "C", russian: "С" },
    { code: "KeyV", english: "V", russian: "М" },
    { code: "KeyB", english: "B", russian: "И" },
    { code: "KeyN", english: "N", russian: "Т" },
    { code: "KeyM", english: "M", russian: "Ь" },
    { code: "Comma", english: ",", russian: "Б", shifted: "<" },
    { code: "Period", english: ".", russian: "Ю", shifted: ">" },
    { code: "Slash", english: "/", shifted: "?" },
    { code: "ShiftRight", english: "Shift", width: "wide" },
  ],
  [
    { code: "ControlLeft", english: "Ctrl", width: "medium" },
    { code: "MetaLeft", english: "Cmd", width: "medium" },
    { code: "AltLeft", english: "Alt", width: "medium" },
    { code: "Space", english: "", width: "space" },
    { code: "AltRight", english: "Alt", width: "medium" },
    { code: "ControlRight", english: "Ctrl", width: "medium" },
  ],
];

const FINGER_BY_CODE: Record<string, Omit<FingerGuide, "key">> = {
  Backquote: { hand: "left", finger: "little" },
  Digit1: { hand: "left", finger: "little" },
  KeyQ: { hand: "left", finger: "little" },
  KeyA: { hand: "left", finger: "little" },
  KeyZ: { hand: "left", finger: "little" },
  Tab: { hand: "left", finger: "little" },
  CapsLock: { hand: "left", finger: "little" },
  ShiftLeft: { hand: "left", finger: "little" },
  Digit2: { hand: "left", finger: "ring" },
  KeyW: { hand: "left", finger: "ring" },
  KeyS: { hand: "left", finger: "ring" },
  KeyX: { hand: "left", finger: "ring" },
  Digit3: { hand: "left", finger: "middle" },
  KeyE: { hand: "left", finger: "middle" },
  KeyD: { hand: "left", finger: "middle" },
  KeyC: { hand: "left", finger: "middle" },
  Digit4: { hand: "left", finger: "index" },
  Digit5: { hand: "left", finger: "index" },
  KeyR: { hand: "left", finger: "index" },
  KeyT: { hand: "left", finger: "index" },
  KeyF: { hand: "left", finger: "index" },
  KeyG: { hand: "left", finger: "index" },
  KeyV: { hand: "left", finger: "index" },
  KeyB: { hand: "left", finger: "index" },
  Digit6: { hand: "right", finger: "index" },
  Digit7: { hand: "right", finger: "index" },
  KeyY: { hand: "right", finger: "index" },
  KeyU: { hand: "right", finger: "index" },
  KeyH: { hand: "right", finger: "index" },
  KeyJ: { hand: "right", finger: "index" },
  KeyN: { hand: "right", finger: "index" },
  KeyM: { hand: "right", finger: "index" },
  Digit8: { hand: "right", finger: "middle" },
  KeyI: { hand: "right", finger: "middle" },
  KeyK: { hand: "right", finger: "middle" },
  Comma: { hand: "right", finger: "middle" },
  Digit9: { hand: "right", finger: "ring" },
  KeyO: { hand: "right", finger: "ring" },
  KeyL: { hand: "right", finger: "ring" },
  Period: { hand: "right", finger: "ring" },
  Digit0: { hand: "right", finger: "little" },
  Minus: { hand: "right", finger: "little" },
  Equal: { hand: "right", finger: "little" },
  KeyP: { hand: "right", finger: "little" },
  BracketLeft: { hand: "right", finger: "little" },
  BracketRight: { hand: "right", finger: "little" },
  Backslash: { hand: "right", finger: "little" },
  Semicolon: { hand: "right", finger: "little" },
  Quote: { hand: "right", finger: "little" },
  Slash: { hand: "right", finger: "little" },
  Enter: { hand: "right", finger: "little" },
  ShiftRight: { hand: "right", finger: "little" },
  Space: { hand: "right", finger: "thumb" },
};

const SHIFTED_TO_CODE: Record<string, string> = {
  "~": "Backquote",
  "!": "Digit1",
  "@": "Digit2",
  "#": "Digit3",
  "$": "Digit4",
  "%": "Digit5",
  "^": "Digit6",
  "&": "Digit7",
  "*": "Digit8",
  "(": "Digit9",
  ")": "Digit0",
  "_": "Minus",
  "+": "Equal",
  "{": "BracketLeft",
  "}": "BracketRight",
  "|": "Backslash",
  ":": "Semicolon",
  "\"": "Quote",
  "<": "Comma",
  ">": "Period",
  "?": "Slash",
};

const PLAIN_TO_CODE: Record<string, string> = {
  "`": "Backquote",
  "-": "Minus",
  "=": "Equal",
  "[": "BracketLeft",
  "]": "BracketRight",
  "\\": "Backslash",
  ";": "Semicolon",
  "'": "Quote",
  ",": "Comma",
  ".": "Period",
  "/": "Slash",
};

const RUSSIAN_TO_CODE: Record<string, string> = {
  ё: "Backquote",
  й: "KeyQ",
  ц: "KeyW",
  у: "KeyE",
  к: "KeyR",
  е: "KeyT",
  н: "KeyY",
  г: "KeyU",
  ш: "KeyI",
  щ: "KeyO",
  з: "KeyP",
  х: "BracketLeft",
  ъ: "BracketRight",
  ф: "KeyA",
  ы: "KeyS",
  в: "KeyD",
  а: "KeyF",
  п: "KeyG",
  р: "KeyH",
  о: "KeyJ",
  л: "KeyK",
  д: "KeyL",
  ж: "Semicolon",
  э: "Quote",
  я: "KeyZ",
  ч: "KeyX",
  с: "KeyC",
  м: "KeyV",
  и: "KeyB",
  т: "KeyN",
  ь: "KeyM",
  б: "Comma",
  ю: "Period",
};

const FINGER_LABELS: Record<Finger, string> = {
  little: "мизинец",
  ring: "безымянный",
  middle: "средний",
  index: "указательный",
  thumb: "большой",
};

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function readBest(userId: string, mode: TrainerMode) {
  if (typeof window === "undefined") return 0;
  try {
    const saved = Number(window.localStorage.getItem(`${BEST_KEY}:${userId}:${mode}`) ?? 0);
    return Number.isFinite(saved) ? saved : 0;
  } catch {
    return 0;
  }
}

function getCodeForCharacter(character: string, mode: TrainerMode) {
  if (character === "\n") return { code: "Enter", shifted: false };
  if (character === " ") return { code: "Space", shifted: false };
  if (character === "\t") return { code: "Tab", shifted: false };

  if (mode === "russian") {
    const lower = character.toLowerCase();
    return {
      code: RUSSIAN_TO_CODE[lower] ?? "Space",
      shifted: character !== lower,
    };
  }

  if (SHIFTED_TO_CODE[character]) {
    return { code: SHIFTED_TO_CODE[character], shifted: true };
  }
  if (PLAIN_TO_CODE[character]) {
    return { code: PLAIN_TO_CODE[character], shifted: false };
  }
  if (/^[a-zA-Z]$/.test(character)) {
    return {
      code: `Key${character.toUpperCase()}`,
      shifted: character === character.toUpperCase(),
    };
  }
  if (/^[0-9]$/.test(character)) {
    return { code: `Digit${character}`, shifted: false };
  }
  return { code: "Space", shifted: false };
}

function getNextKey(character: string, mode: TrainerMode): NextKey {
  const { code, shifted } = getCodeForCharacter(character, mode);
  const primary = FINGER_BY_CODE[code] ?? FINGER_BY_CODE.Space;
  const display =
    character === "\n" ? "Enter" : character === " " ? "Пробел" : character === "\t" ? "Tab" : character;
  const primaryGuide: FingerGuide = {
    ...primary,
    key: display,
  };

  if (!shifted) {
    return {
      code,
      display,
      guides: [primaryGuide],
      highlightCodes: [code],
    };
  }

  const shiftHand: HandSide = primary.hand === "left" ? "right" : "left";
  const shiftCode = shiftHand === "left" ? "ShiftLeft" : "ShiftRight";
  return {
    code,
    display,
    guides: [
      { hand: shiftHand, finger: "little", key: "Shift" },
      primaryGuide,
    ],
    highlightCodes: [shiftCode, code],
  };
}

function HandDiagram({
  side,
  activeFingers,
}: {
  side: HandSide;
  activeFingers: Set<Finger>;
}) {
  const fingers: Finger[] = ["little", "ring", "middle", "index", "thumb"];

  return (
    <div className={`trainer-hand trainer-hand-${side}`}>
      <span className="trainer-hand-label">{side === "left" ? "Левая" : "Правая"}</span>
      <div className="trainer-hand-visual" aria-hidden="true">
        <Hand className="trainer-hand-icon" strokeWidth={0.58} />
        {fingers.map((finger) => (
          <i
            className={`trainer-fingertip finger-${finger} ${activeFingers.has(finger) ? "is-active" : ""}`}
            key={finger}
          />
        ))}
      </div>
    </div>
  );
}

function CodeTarget({
  target,
  typed,
}: {
  target: string;
  typed: string;
}) {
  const lines = target.split("\n");

  return (
    <div className="trainer-code-lines" aria-hidden="true">
      {lines.map((line, lineIndex) => {
        const lineOffset = lines
          .slice(0, lineIndex)
          .reduce((total, previousLine) => total + previousLine.length + 1, 0);

        return (
          <div className="trainer-code-line" key={`${lineIndex}-${line}`}>
            <span className="trainer-line-number">{lineIndex + 1}</span>
            <code>
              {Array.from(line).map((character, characterIndex) => {
                const globalIndex = lineOffset + characterIndex;
                const typedCharacter = typed[globalIndex];
                const isCurrent = globalIndex === typed.length;
                const state =
                  typedCharacter === undefined
                    ? isCurrent
                      ? "is-current"
                      : "is-future"
                    : typedCharacter === character
                      ? "is-correct"
                      : "is-mistake";

                return (
                  <span className={state} key={`${globalIndex}-${characterIndex}`}>
                    {character}
                  </span>
                );
              })}
              {line.length === 0 && <span className={typed.length === lineOffset ? "is-current" : "is-future"}> </span>}
              {lineIndex < lines.length - 1 && typed.length === lineOffset + line.length && (
                <span className="is-current trainer-newline-caret"> </span>
              )}
            </code>
          </div>
        );
      })}
    </div>
  );
}

export default function TypingTrainer({ userId }: { userId: string }) {
  const [mode, setMode] = useState<TrainerMode>("python");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [focused, setFocused] = useState(false);
  const [keystrokes, setKeystrokes] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState(() => readBest(userId, "python"));
  const [isNewBest, setIsNewBest] = useState(false);
  const captureRef = useRef<HTMLTextAreaElement>(null);
  const codeScrollRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const target = EXERCISES[mode][exerciseIndex % EXERCISES[mode].length];
  const completed = typed.length === target.length && target.length > 0;
  const currentCharacter = target[typed.length] ?? "";
  const nextKey = useMemo(
    () => getNextKey(currentCharacter || " ", mode),
    [currentCharacter, mode],
  );
  const accuracy = keystrokes > 0
    ? Math.max(0, Math.round(((keystrokes - mistakes) / keystrokes) * 100))
    : 100;
  const speed = elapsedMs > 0
    ? Math.round((typed.length / elapsedMs) * 60_000)
    : 0;

  useEffect(() => {
    elapsedRef.current = elapsedMs;
  }, [elapsedMs]);

  useEffect(() => {
    queueMicrotask(() => setBest(readBest(userId, mode)));
  }, [mode, userId]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsedMs(Date.now() - startedAtRef.current);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      captureRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const scrollContainer = codeScrollRef.current;
    const cursor = scrollContainer?.querySelector<HTMLElement>(".is-current");
    if (!scrollContainer || !cursor) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const cursorRect = cursor.getBoundingClientRect();
    const verticalMargin = Math.min(64, containerRect.height * 0.24);
    const horizontalMargin = Math.min(80, containerRect.width * 0.16);

    if (cursorRect.bottom > containerRect.bottom - verticalMargin) {
      scrollContainer.scrollTop += cursorRect.bottom - (containerRect.bottom - verticalMargin);
    } else if (cursorRect.top < containerRect.top + verticalMargin) {
      scrollContainer.scrollTop -= containerRect.top + verticalMargin - cursorRect.top;
    }

    if (cursorRect.right > containerRect.right - horizontalMargin) {
      scrollContainer.scrollLeft += cursorRect.right - (containerRect.right - horizontalMargin);
    } else if (cursorRect.left < containerRect.left + horizontalMargin) {
      scrollContainer.scrollLeft -= containerRect.left + horizontalMargin - cursorRect.left;
    }
  }, [target, typed]);

  const reset = (nextMode = mode, nextExerciseIndex = exerciseIndex) => {
    setMode(nextMode);
    setExerciseIndex(nextExerciseIndex);
    setTyped("");
    setElapsedMs(0);
    setRunning(false);
    setFocused(false);
    setKeystrokes(0);
    setMistakes(0);
    setBest(readBest(userId, nextMode));
    setIsNewBest(false);
    startedAtRef.current = null;
    elapsedRef.current = 0;
    if (codeScrollRef.current) {
      codeScrollRef.current.scrollTop = 0;
      codeScrollRef.current.scrollLeft = 0;
    }
    requestAnimationFrame(() => captureRef.current?.focus({ preventScroll: true }));
  };

  const startTimer = () => {
    if (running || completed) return;
    startedAtRef.current = Date.now() - elapsedRef.current;
    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
    startedAtRef.current = null;
    setFocused(false);
    captureRef.current?.blur();
  };

  const handleChange = (value: string, countedCharacters?: number) => {
    if (completed) return;
    let nextValue = value.slice(0, target.length);
    let charactersToCount = countedCharacters;

    if (
      nextValue.length === typed.length + 1 &&
      nextValue[typed.length] === "\n" &&
      target[typed.length] === "\n"
    ) {
      let nextContentIndex = typed.length + 1;
      while (target[nextContentIndex] === " ") nextContentIndex += 1;
      nextValue = `${nextValue}${target.slice(typed.length + 1, nextContentIndex)}`;
      charactersToCount ??= 1;
    }

    if (nextValue.length > typed.length) {
      const added = nextValue.slice(typed.length);
      const counted = added.slice(0, charactersToCount ?? added.length);
      let addedMistakes = 0;
      Array.from(counted).forEach((character, index) => {
        if (character !== target[typed.length + index]) addedMistakes += 1;
      });
      setKeystrokes((current) => current + counted.length);
      setMistakes((current) => current + addedMistakes);
      startTimer();
    }
    setTyped(nextValue);

    if (nextValue.length === target.length) {
      const finalElapsed = startedAtRef.current === null
        ? elapsedRef.current
        : Date.now() - startedAtRef.current;
      const resultSpeed = finalElapsed > 0
        ? Math.round((nextValue.length / finalElapsed) * 60_000)
        : 0;
      const nextIsBest = resultSpeed > best;
      setElapsedMs(finalElapsed);
      setRunning(false);
      setFocused(false);
      setIsNewBest(nextIsBest);
      startedAtRef.current = null;
      captureRef.current?.blur();
      if (nextIsBest) {
        setBest(resultSpeed);
        try {
          window.localStorage.setItem(`${BEST_KEY}:${userId}:${mode}`, String(resultSpeed));
        } catch {
          // The result still remains visible for this session.
        }
      }
    }
  };

  const activeByHand = useMemo(() => {
    const left = new Set<Finger>();
    const right = new Set<Finger>();
    nextKey.guides.forEach((guide) => {
      (guide.hand === "left" ? left : right).add(guide.finger);
    });
    return { left, right };
  }, [nextKey]);

  return (
    <div className={`typing-trainer ${focused ? "is-focused" : ""} ${completed ? "is-complete" : ""}`}>
      <section className="trainer-hero">
        <div className="trainer-heading">
          <p className="eyebrow">Тренажёр</p>
          <h1>Печатаем код</h1>
          <p>Тренируйте скорость, точность и привычные сочетания клавиш.</p>
          <div className="trainer-modes" aria-label="Режим тренировки">
            {MODE_OPTIONS.map((option) => (
              <button
                className={mode === option.id ? "is-active" : ""}
                onClick={() => reset(option.id, 0)}
                aria-pressed={mode === option.id}
                key={option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="trainer-metrics" aria-label="Текущие показатели">
          <div>
            <span>Время</span>
            <strong>{formatTime(elapsedMs)}</strong>
          </div>
          <div>
            <span>Скорость</span>
            <strong>{speed}<small> зн/мин</small></strong>
          </div>
          <div>
            <span>Точность</span>
            <strong>{accuracy}%</strong>
          </div>
        </div>
      </section>

      <section className={`trainer-stage ${focused ? "is-focused" : ""} ${completed ? "is-complete" : ""}`}>
        <div className="trainer-stage-toolbar">
          <span>Упражнение {exerciseIndex + 1} из {EXERCISES[mode].length}</span>
          <div>
            {best > 0 && <span>Лучший: <b>{best}</b> зн/мин</span>}
            <button onClick={pause} disabled={!running}>Пауза</button>
          </div>
        </div>

        <div className="trainer-code-scroll" ref={codeScrollRef}>
          <CodeTarget target={target} typed={typed} />
        </div>

        <textarea
          ref={captureRef}
          className="trainer-capture"
          value={typed}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !completed) {
              event.preventDefault();
              const cursorIndex = typed.length;
              const nextLineStart = cursorIndex + 1;
              let nextContentIndex = nextLineStart;

              if (target[cursorIndex] === "\n") {
                while (target[nextContentIndex] === " ") nextContentIndex += 1;
                const indentation = target.slice(nextLineStart, nextContentIndex);
                handleChange(`${typed}\n${indentation}`, 1);
              } else {
                handleChange(`${typed}\n`, 1);
              }
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              pause();
            }
          }}
          onPaste={(event) => event.preventDefault()}
          onDrop={(event) => event.preventDefault()}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Поле тренировки печати"
        />

        {!typed && !completed && (
          <div className="trainer-start-note" aria-hidden="true">
            <i />
            <span>Как только начнёте писать, таймер пойдёт</span>
          </div>
        )}

        {completed && (
          <section className="trainer-result-overlay" aria-live="polite">
            <div>
              <p className="eyebrow">Результат</p>
              <h2>Код набран!</h2>
              <p>{isNewBest ? "Новый лучший темп — отличная работа." : "Точность важнее спешки. Попробуйте ещё раз."}</p>
            </div>
            <div className="trainer-result-stats">
              <span><strong>{speed}</strong> зн/мин</span>
              <span><strong>{accuracy}%</strong> точность</span>
              <span><strong>{mistakes}</strong> ошибок</span>
            </div>
            <div className="trainer-result-actions">
              <button onClick={() => reset()}>Повторить</button>
              <button
                onClick={() =>
                  reset(mode, (exerciseIndex + 1) % EXERCISES[mode].length)
                }
              >
                Следующее
              </button>
            </div>
          </section>
        )}
      </section>

      <section className="trainer-guidance" aria-label="Подсказка по клавиатуре">
        <div className="trainer-keyboard" aria-hidden="true">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div className="trainer-keyboard-row" key={rowIndex}>
              {row.map((key) => {
                const isHighlighted = nextKey.highlightCodes.includes(key.code) && !completed;
                const label = mode === "russian" && key.russian ? key.russian : key.english;
                return (
                  <span
                    className={`trainer-key key-${key.width ?? "normal"} ${
                      isHighlighted ? "is-active" : ""
                    }`}
                    key={key.code}
                  >
                    {key.shifted && <small>{key.shifted}</small>}
                    <b>{label}</b>
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <aside className="trainer-hands">
          <div className="trainer-next-key">
            <span>Следующая клавиша</span>
            <strong>{completed ? "Готово" : nextKey.display}</strong>
          </div>
          <div className="trainer-hand-pair">
            <HandDiagram side="left" activeFingers={completed ? new Set() : activeByHand.left} />
            <HandDiagram side="right" activeFingers={completed ? new Set() : activeByHand.right} />
          </div>
          <div className="trainer-finger-guides">
            {completed ? (
              <span>Упражнение завершено</span>
            ) : (
              nextKey.guides.map((guide, index) => (
                <span key={`${guide.hand}-${guide.finger}-${index}`}>
                  <i className={`guide-dot guide-${guide.hand}`} />
                  <b>{guide.hand === "left" ? "Левый" : "Правый"} {FINGER_LABELS[guide.finger]}</b>
                  <small>{guide.key}</small>
                </span>
              ))
            )}
          </div>
          <p className="trainer-mobile-note">На телефоне печатайте на системной клавиатуре — подсказка останется сверху.</p>
        </aside>
      </section>

    </div>
  );
}
