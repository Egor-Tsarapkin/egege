"use client";

import { Code2, Languages, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Mode = "words" | "code";
type Duration = 30 | 60 | 90 | 120;

const WORDS = `где кровать жить пока сила лицо время страна земля мочь ряд про выйти делать дверь отказываться куда последний можно понимать главный весь вид кто бывать отец работа дом школа задача ответ число программа ученик учитель сегодня завтра быстро точно спокойно внимание привычка клавиша экран рука палец строка слово код функция список цикл условие результат файл данные память сеть адрес маска система решение проверка пример практика скорость ошибка начало конец новый старый большой маленький первый второй каждый другой вместе после перед между через снова всегда иногда сразу просто важно верно хорошо думать писать читать считать находить менять запускать возвращать выводить создавать открывать сохранять получать использовать русский обычный язык печать тренировка ритм точность знание экзамен информатика питон алгоритм команда значение переменная символ последовательность диапазон сумма количество минимум максимум среднее элемент индекс остаток деление степень корень модуль четный нечетный истинный ложный`.split(" ");

const PROGRAMS = [
`a = '0123456789abcdefghijklmnopqrs'

for x in a:
    v1 = f'923{x}874'
    v2 = f'524{x}6152'
    v = int(v1, 29) + int(v2, 29)

    if v % 28 == 0:
        print(v // 28)`,
`def f(s, e):
    if s < e:
        return 0
    if s == e:
        return 1
    if s > e:
        s1 = str(s)
        if s1[-2] > s1[-1]:
            return f(s-3, e) + f(int(s1[0] + s1[-1] + s1[-2]), e)
        return f(s-3, e)

print(f(1001, 959) * f(959, 902))`,
`def f(s, e):
    if s > e or s == 21:
        return 0
    if s == e:
        return 1
    return f(s+2, e) + f(s+3, e) + f(s*2, e)

print(f(7, 14) * f(14, 32))`,
`from math import ceil, log2

d = 289
N = 10 + 1015
i = ceil(log2(N))
v_id_bate = ceil(d * i / 8)

print(v_id_bate * 524288 / 1024 / 1024)`,
`from ipaddress import *

net = ip_network('172.95.116.174/255.255.192.0', 0)
print(net[1])`,
`from ipaddress import *

n = ip_network('98.71.254.171/255.248.0.0', 0)

for i in n:
    b = f'{int(i):032b}'
    if b.count('1') % 7 == 0:
        print(i)
        break`,
`from math import ceil

def f(a, b, m):
    if a + b <= 60:
        return m % 2 == 0
    if m == 0:
        return 0
    h = [f(a-5, b, m-1), f(a, b-3, m-1), f(a//2, b, m-1), f(a, ceil(b/2), m-1)]
    return any(h) if m % 2 else all(h)

print([s for s in range(5, 151) if f(130, s, 2)])
print([s for s in range(5, 151) if f(130, s, 3) and not f(130, s, 1)])`,
`def f(a, b, m):
    if a + b >= 207:
        return m % 2 == 0
    if m == 0:
        return 0
    h = [f(a+1, b, m-1), f(a, b+1, m-1), f(a*2, b, m-1), f(a, b*2, m-1)]
    return any(h) if m % 2 else all(h)

print([s for s in range(1, 190) if f(17, s, 2)])
print([s for s in range(1, 190) if f(17, s, 3) and not f(17, s, 1)])`,
`a = [int(i) for i in open('17.txt')]

t = []
mx_11 = max([x for x in a if str(x)[-2:] == '11'])
for i in range(len(a)-2):
    if (a[i] < 0) + (a[i+1] < 0) + (a[i+2] < 0) == 0:
        if a[i] + a[i+1] + a[i+2] >= mx_11:
            t.append(a[i] + a[i+1] + a[i+2])

print(len(t), min(t))`,
`a = [int(i) for i in open('17.txt')]
mx_28 = max([x for x in a if x > 0 and str(x)[-2:] == '28'])
t = []
for i in range(len(a)-2):
    troika = [a[i], a[i+1], a[i+2]]
    c_3 = [x for x in troika if len(str(abs(x))) == 3]
    if len(c_3) > 0:
        sr_a = sum(troika) / len(troika)
        if 0 < sr_a < mx_28:
            t.append(sum(troika))

print(len(t), max(t))`,
`def f(x):
    a = []
    while x % 2 == 0:
        a.append(2)
        x //= 2
    d = 3
    while d <= x**0.5:
        while x % d == 0:
            a.append(d)
            x //= d
        d += 2
    if x > 1:
        a.append(x)
    return a`,
`for n in range(15_000_001, 16_000_000):
    list_p_d = f(n)
    if len(list_p_d) == 3:
        if list_p_d[1] - list_p_d[0] == list_p_d[2] - list_p_d[1]:
            print(n, sum(list_p_d) // len(list_p_d))`,
`def d(x):
    a = []
    for i in range(2, int(x**0.5) + 1):
        if x % i == 0:
            a.append(i)
            a.append(x // i)
    return sorted(set(a))`,
`from fnmatch import *

for n in range(0, 10**11 + 1, 154682):
    s = str(n)
    if fnmatch(s, '*192?3*68'):
        print(n, n // 154682)`,
`from functools import *

@lru_cache(None)
def f(n):
    if n <= 3:
        return n - 1
    if n % 2 == 0:
        return f(n-2) + n/2 - f(n-4)
    return f(n-1) * n + f(n-2)

for i in range(5000):
    f(i)

print(f(4952) + 2 * f(4958) + f(4964))`,
`from itertools import *

c = 0
for i in product('0123456789abcdefghij', repeat=5):
    s = ''.join(i)
    if s[0] != '0':
        if int(s[0], 20) + int(s[-1], 20) == 26:
            if all(int(s[i], 20) % 2 != int(s[i+1], 20) % 2 for i in range(len(s)-1)):
                c += 1
print(c)`,
`a = []

for n in range(1, 1000):
    r = bin(n)[2:]
    sm = sum(int(i) for i in r)
    r += str(sm % 2)
    sm = sum(int(i) for i in r)
    r += str(sm % 2)
    r = int(r, 2)
    if r > 253:
        a.append(n)

print(min(a))`,
`a = []

for n in range(1, 1000):
    r = bin(n)[2:]
    sm = sum(int(i) for i in r)
    if sm % 2 == 0:
        r = '10' + r[2:] + '0'
    else:
        r = '11' + r[2:] + '1'
    r = int(r, 2)
    if n > 27:
        a.append(r)

print(min(a))`,
`def t(x, s):
    r = ''
    while x > 0:
        r = str(x % s) + r
        x //= s
    return r`,
`a = []
for n in range(1, 1000):
    r = t(n, 3)
    if n % 3 == 0:
        r += r[-2:]
    else:
        r += t((n % 3) * 3, 3)
    r = int(r, 3)
    if r <= 150:
        a.append(n)

print(max(a))`,
];

function codeExercises() {
  const result = new Set<string>();
  PROGRAMS.forEach((program) => {
    const lines = program.split("\n");
    result.add(program);
    for (let size = 3; size <= Math.min(8, lines.length); size += 1) {
      for (let start = 0; start + size <= lines.length; start += 1) {
        const part = lines.slice(start, start + size).join("\n").trimEnd();
        if (part.trim().length > 28) result.add(part);
      }
    }
  });
  return [...result];
}

const CODE_EXERCISES = codeExercises();

function makeWords(count = 260) {
  const pool = [...WORDS];
  const output: string[] = [];
  while (output.length < count) {
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    output.push(...pool);
  }
  return output.slice(0, count).join(" ");
}

function PaintedText({ target, typed, words }: { target: string; typed: string; words: boolean }) {
  return <div className={words ? "typing-words" : "typing-code"} aria-hidden="true">
    {Array.from(target).map((char, index) => {
      const entered = typed[index];
      const state = entered === undefined ? (index === typed.length ? "current" : "future") : entered === char ? "correct" : "wrong";
      return <span className={state} key={index}>{char}</span>;
    })}
  </div>;
}

export default function TypingTrainer({ userId: _userId }: { userId: string }) {
  const [mode, setMode] = useState<Mode>("words");
  const [duration, setDuration] = useState<Duration>(60);
  const [words, setWords] = useState(() => makeWords());
  const [codeIndex, setCodeIndex] = useState(() => Math.floor(Math.random() * CODE_EXERCISES.length));
  const [typed, setTyped] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const target = mode === "words" ? words : CODE_EXERCISES[codeIndex];
  const elapsed = mode === "words" ? duration - secondsLeft : 0;
  const accuracy = typed.length ? Math.max(0, Math.round((typed.length - mistakes) / typed.length * 100)) : 100;
  const speed = elapsed > 0 ? Math.round(typed.length / elapsed * 60) : 0;

  const reset = (nextMode = mode, nextDuration = duration) => {
    setMode(nextMode); setDuration(nextDuration); setSecondsLeft(nextDuration);
    setTyped(""); setMistakes(0); setRunning(false); setFinished(false);
    if (nextMode === "words") setWords(makeWords());
    else setCodeIndex((current) => (current + 1 + Math.floor(Math.random() * (CODE_EXERCISES.length - 1))) % CODE_EXERCISES.length);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (!running || mode !== "words") return;
    const timer = window.setInterval(() => setSecondsLeft((value) => {
      if (value <= 1) { setRunning(false); setFinished(true); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running, mode, duration]);

  useEffect(() => {
    const current = stageRef.current?.querySelector(".current");
    current?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [typed]);

  const change = (value: string) => {
    if (finished) return;
    const next = value.slice(0, target.length);
    if (next.length > typed.length) {
      const added = next.slice(typed.length);
      setMistakes((count) => count + [...added].filter((char, i) => char !== target[typed.length + i]).length);
      setRunning(true);
    }
    setTyped(next);
    if (mode === "code" && next.length === target.length) { setRunning(false); setFinished(true); }
  };

  return <div className="typing-trainer monkey-trainer">
    <header className="monkey-header">
      <div><p className="eyebrow">Печать</p><h1>Печатай. Запоминай.</h1></div>
      <div className="monkey-stats"><span><b>{mode === "words" ? secondsLeft : typed.length}</b>{mode === "words" ? "сек" : "знаков"}</span><span><b>{speed}</b>зн/мин</span><span><b>{accuracy}%</b>точность</span></div>
    </header>

    <nav className="monkey-controls" aria-label="Настройки печати">
      <div className="monkey-switch">
        <button className={mode === "words" ? "active" : ""} onClick={() => reset("words")}><Languages size={15}/>Обычный язык</button>
        <button className={mode === "code" ? "active" : ""} onClick={() => reset("code")}><Code2 size={15}/>Код</button>
      </div>
      {mode === "words" && <div className="monkey-times">{([30,60,90,120] as Duration[]).map((time) => <button className={duration === time ? "active" : ""} onClick={() => reset("words", time)} key={time}>{time}</button>)}</div>}
      {mode === "code" && <span className="exercise-count">{CODE_EXERCISES.length} вариантов</span>}
    </nav>

    <section className={`monkey-stage ${mode} ${finished ? "finished" : ""}`} onClick={() => inputRef.current?.focus()} ref={stageRef}>
      <PaintedText target={target} typed={typed} words={mode === "words"}/>
      <textarea ref={inputRef} value={typed} onChange={(event) => change(event.target.value)} onPaste={(event) => event.preventDefault()} spellCheck={false} autoCapitalize="none" autoCorrect="off" aria-label="Поле печати" />
      {finished && <div className="monkey-result"><b>{mode === "words" ? `${speed} зн/мин` : "Готово"}</b><span>{accuracy}% точность · {mistakes} ошибок</span></div>}
    </section>
    <button className="monkey-restart" onClick={() => reset()} aria-label="Новое упражнение"><RotateCcw size={19}/><span>{mode === "code" ? "другой фрагмент" : "заново"}</span></button>
  </div>;
}
