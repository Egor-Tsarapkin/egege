"use client";

import { Hand, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type TrainerMode = "python" | "russian" | "english";
type RussianDuration = 30 | 60 | 90 | 120;
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

type TrainerXpResult = {
  status: "awarded" | "duplicate" | "limit" | "too_slow";
  message: string;
  awarded: number;
  earnedToday?: number;
  remaining?: number;
};

const BEST_KEY = "egege-typing-best-v1";

const MODE_OPTIONS: Array<{ id: TrainerMode; label: string }> = [
  { id: "python", label: "Python" },
  { id: "russian", label: "Русский" },
  { id: "english", label: "Английский" },
];

const RUSSIAN_DURATIONS: RussianDuration[] = [30, 60, 90, 120];
const RUSSIAN_WORDS = `время человек работа жизнь день дом задача программа ученик учитель школа
результат решение пример практика скорость точность клавиатура экран рука палец слово строка
число функция список цикл условие файл данные память сеть система алгоритм команда значение
переменная последовательность диапазон сумма количество минимум максимум элемент индекс остаток
деление степень корень модуль начало конец первый второй каждый другой вместе после перед между
через снова всегда иногда сразу просто важно верно хорошо быстро спокойно внимательно уверенно
думать писать читать считать находить менять запускать возвращать выводить создавать открывать
сохранять получать использовать проверять исправлять продолжать понимать помнить узнавать выбирать
новый старый большой маленький точный обычный главный следующий последний правильный сложный
короткий длинный русский язык печать тренировка привычка знание экзамен информатика сегодня завтра`.split(/\s+/);
const ENGLISH_WORDS = `time people work life day home task program student teacher school result
solution example practice speed accuracy keyboard screen hand finger word line number function list
loop condition file data memory network system algorithm command value variable sequence range sum
count minimum maximum element index remainder division power root module start end first second each
other together after before between through again always sometimes quickly simply important correct
good fast calm careful confident think write read count find change run return print create open save
receive use check fix continue understand remember learn choose new old big small exact usual main next
last right difficult short long english language typing training habit knowledge exam computer today
tomorrow world place way year thing problem question answer code learn build make take give know see`.split(/\s+/);

function createRussianText(wordCount = 420) {
  const words: string[] = [];
  let previous = "";
  while (words.length < wordCount) {
    const word = RUSSIAN_WORDS[Math.floor(Math.random() * RUSSIAN_WORDS.length)];
    if (word !== previous) {
      words.push(word);
      previous = word;
    }
  }
  return words.join(" ");
}

function createEnglishText(wordCount = 420) {
  const words: string[] = [];
  let previous = "";
  while (words.length < wordCount) {
    const word = ENGLISH_WORDS[Math.floor(Math.random() * ENGLISH_WORDS.length)];
    if (word !== previous) {
      words.push(word);
      previous = word;
    }
  }
  return words.join(" ");
}

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
    `numbers = list(map(int, input().split()))
count = 0
for number in numbers:
    if number % 3 == 0 and number % 5 != 0:
        count += 1
print(count)`,
    `number = int(input())
maximum = 0
while number > 0:
    digit = number % 10
    if digit > maximum:
        maximum = digit
    number //= 10
print(maximum)`,
    `text = input()
result = ""
for index in range(len(text) - 1, -1, -1):
    result += text[index]
print(result)`,
    `start = int(input())
finish = int(input())
total = 0
for value in range(start, finish + 1):
    if value % 4 == 0:
        total += value
print(total)`,
    `values = list(map(int, input().split()))
minimum = values[0]
for value in values[1:]:
    if value < minimum:
        minimum = value
print(minimum)`,
    `def is_valid(number):
    return number % 2 == 0 and number % 7 == 0

for value in range(10, 100):
    if is_valid(value):
        print(value)`,
    `word = input()
longest = ""
for part in word.split("_"):
    if len(part) > len(longest):
        longest = part
print(longest)`,
    `a, b = map(int, input().split())
while b != 0:
    a, b = b, a % b
print(a)`,
    `a = '0123456789abcdefghijklmnopqrs'

for x in a:
    v1 = f'923{x}874'
    v2 = f'524{x}6152'
    v = int(v1, 29) + int(v2, 29)`,
    `for x in a:
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
        s1 = str(s)`,
    `s1 = str(s)
if s1[-2] > s1[-1]:
    return f(s-3, e) + f(int(s1[0] + s1[-1] + s1[-2]), e)
else:
    return f(s-3, e)`,
    `def f(s, e):
    if s > e or s == 21:
        return 0
    if s == e:
        return 1
    if s < e:
        return f(s+2, e) + f(s+3, e) + f(s*2, e)`,
    `print(f(7, 14) * f(14, 32))`,
    `from math import ceil, log2

d = 289
N = 10 + 1015
i = ceil(log2(N))
v_id_bate = ceil(d * i / 8)`,
    `i = ceil(log2(N))
v_id_bate = ceil(d * i / 8)

print(v_id_bate * 524288 / 1024 / 1024)`,
    `from ipaddress import *

net = ip_network('172.95.116.174/255.255.192.0', 0)
print(net[1])`,
    `from ipaddress import *

n = ip_network('98.71.254.171/255.248.0.0', 0)

for i in n:
    b = f'{int(i):032b}'`,
    `for i in n:
    b = f'{int(i):032b}'
    if b.count('1') % 7 == 0:
        print(i)
        break`,
    `from math import ceil

def f(a, b, m):
    if a + b <= 60:
        return m % 2 == 0
    if m == 0:
        return 0`,
    `h = [f(a-5, b, m-1), f(a, b-3, m-1),
     f(a//2, b, m-1), f(a, ceil(b/2), m-1)]
return any(h) if m % 2 else all(h)`,
    `print([s for s in range(5, 151) if f(130, s, 2)])
print([s for s in range(5, 151) if f(130, s, 3) and not f(130, s, 1)])`,
    `print([s for s in range(5, 151)
       if f(130, s, 5)
       and not f(130, s, 3)
       and not f(130, s, 1)])`,
    `def f(a, b, m):
    if a + b >= 207:
        return m % 2 == 0
    if m == 0:
        return 0
    h = [f(a+1, b, m-1), f(a, b+1, m-1),
         f(a*2, b, m-1), f(a, b*2, m-1)]`,
    `return any(h) if m % 2 else all(h)

print([s for s in range(1, 190) if f(17, s, 2)])
print([s for s in range(1, 190) if f(17, s, 3) and not f(17, s, 1)])`,
    `a = [int(i) for i in open('17.txt')]

t = []
mx_11 = max([x for x in a if str(x)[-2:] == '11'])`,
    `for i in range(len(a)-2):
    if (a[i] < 0) + (a[i+1] < 0) + (a[i+2] < 0) == 0:
        if a[i] + a[i+1] + a[i+2] >= mx_11:
            t.append(a[i] + a[i+1] + a[i+2])

print(len(t), min(t))`,
    `a = [int(i) for i in open('17.txt')]
mx_28 = max([x for x in a if x > 0 and str(x)[-2:] == '28'])
t = []

for i in range(len(a)-2):
    troika = [a[i], a[i+1], a[i+2]]`,
    `troika = [a[i], a[i+1], a[i+2]]
c_3 = [x for x in troika if len(str(abs(x))) == 3]
if len(c_3) > 0:
    sr_a = sum(troika) / len(troika)
    if 0 < sr_a < mx_28:
        t.append(sum(troika))`,
    `def f(x):
    a = []

    while x % 2 == 0:
        a.append(2)
        x = x // 2`,
    `d = 3
while d <= x**0.5:
    while x % d == 0:
        a.append(d)
        x = x // d
    d += 2`,
    `if x > 1:
    a.append(x)

return a`,
    `for n in range(15_000_000 + 1, 15_000_000 + 1000000):
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
    `def d(x):
    divisors = []
    for i in range(2, int(x**0.5) + 1):
        if x % i == 0:
            divisors += [i, x // i]
    return sorted(set(divisors))`,
    `for i in range(2, int(x**0.5) + 1):
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
        return n - 1`,
    `if n > 3 and n % 2 == 0:
    return f(n-2) + n/2 - f(n-4)
if n > 3 and n % 2 != 0:
    return f(n-1) * n + f(n-2)`,
    `for i in range(5000):
    f(i)

print(f(4952) + 2 * f(4958) + f(4964))`,
    `from itertools import *

c = 0
for i in product('0123456789abcdefghij', repeat=5):
    s = ''.join(i)
    if s[0] != '0':
        if int(s[0], 20) + int(s[-1], 20) == 26:`,
    `if all([int(s[i], 20) % 2 != int(s[i+1], 20) % 2
        for i in range(len(s)-1)]):
    c += 1

print(c)`,
    `a = []

for n in range(1, 1000):
    r = bin(n)[2:]
    sm = sum([int(i) for i in r])
    r = r + str(sm % 2)`,
    `sm = sum([int(i) for i in r])
r = r + str(sm % 2)
r = int(r, 2)

if r > 253:
    a.append(n)`,
    `for n in range(1, 1000):
    r = bin(n)[2:]
    sm = sum([int(i) for i in r])

    if sm % 2 == 0:
        r = '10' + r[2:] + '0'
    else:
        r = '11' + r[2:] + '1'`,
    `a = []

for n in range(1, 100):
    r = bin(n)[2:]
    if n % 2 == 0:
        r = '10' + r
    else:
        r = '1' + r + '01'`,
    `r = int(r, 2)

if r < 30:
    a.append(n)

print(max(a))`,
    `def t(x, s):
    r = ''
    while x > 0:
        r = str(x % s) + r
        x = x // s
    return r`,
    `def t(x, system):
    result = ''
    while x > 0:
        result = str(x % system) + result
        x //= system
    return result`,
    `r = ''
while x > 0:
    r = str(x % s) + r
    x = x // s

return r`,
    `a = []
for n in range(1, 1000):
    r = t(n, 3)

    if n % 3 == 0:
        r = r + r[-2:]
    else:
        r = r + t((n % 3) * 3, 3)`,
    `r = int(r, 3)

if r <= 150:
    a.append(n)

print(max(a))`,
  ],
  russian: [
    "",
  ],
  english: [
    "",
  ],
};

function shuffledIndexes(length: number, excluded = -1) {
  const indexes = Array.from({ length }, (_, index) => index).filter(
    (index) => index !== excluded,
  );
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]];
  }
  return indexes;
}

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
        <div className="trainer-finger-layer">
          {fingers.map((finger) => (
            <i
              className={`trainer-fingertip finger-${finger} ${activeFingers.has(finger) ? "is-active" : ""}`}
              key={finger}
            />
          ))}
        </div>
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

function RussianTarget({ target, typed }: { target: string; typed: string }) {
  return (
    <div className="trainer-russian-text" aria-hidden="true">
      {Array.from(target).map((character, index) => {
        const typedCharacter = typed[index];
        const state = typedCharacter === undefined
          ? index === typed.length ? "is-current" : "is-future"
          : typedCharacter === character ? "is-correct" : "is-mistake";
        return <span className={state} key={index}>{character}</span>;
      })}
    </div>
  );
}

export default function TypingTrainer({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete: (mode: TrainerMode, wordsPerMinute: number, attemptId: string) => Promise<TrainerXpResult>;
}) {
  const [mode, setMode] = useState<TrainerMode>("python");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [russianText, setRussianText] = useState(() => createRussianText());
  const [englishText, setEnglishText] = useState(() => createEnglishText());
  const [russianDuration, setRussianDuration] = useState<RussianDuration>(60);
  const [typed, setTyped] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [focused, setFocused] = useState(false);
  const [keystrokes, setKeystrokes] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState(() => readBest(userId, "python"));
  const [isNewBest, setIsNewBest] = useState(false);
  const [xpMessage, setXpMessage] = useState("");
  const [dailyXp, setDailyXp] = useState<number | null>(null);
  const captureRef = useRef<HTMLTextAreaElement>(null);
  const codeScrollRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const exerciseBags = useRef<Record<TrainerMode, number[]>>({
    python: [],
    russian: [],
    english: [],
  });
  const awardedAttemptRef = useRef("");
  const initialCodeChosenRef = useRef(false);

  const awardResult = (resultMode: TrainerMode, resultWordSpeed: number) => {
    const attemptId = crypto.randomUUID();
    awardedAttemptRef.current = attemptId;
    setXpMessage("Сохраняем результат…");
    void onComplete(resultMode, resultWordSpeed, attemptId)
      .then((result) => {
        if (awardedAttemptRef.current !== attemptId) return;
        setXpMessage(result.message);
        if (typeof result.earnedToday === "number") setDailyXp(result.earnedToday);
      })
      .catch((error) => {
        if (awardedAttemptRef.current !== attemptId) return;
        setXpMessage(error instanceof Error ? error.message : "Не удалось начислить XP.");
      });
  };

  const isLanguageMode = mode !== "python";
  const target = mode === "russian"
    ? russianText
    : mode === "english"
      ? englishText
      : EXERCISES.python[exerciseIndex % EXERCISES.python.length];
  const timeLimitMs = russianDuration * 1000;
  const timeExpired = isLanguageMode && elapsedMs >= timeLimitMs;
  const completed = timeExpired || (typed.length === target.length && target.length > 0);
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
  const wordSpeed = Math.round(speed / 5);
  const displayedTime = isLanguageMode
    ? Math.max(0, timeLimitMs - elapsedMs)
    : elapsedMs;

  useEffect(() => {
    elapsedRef.current = elapsedMs;
  }, [elapsedMs]);

  useEffect(() => {
    if (initialCodeChosenRef.current) return;
    initialCodeChosenRef.current = true;
    const choices = shuffledIndexes(EXERCISES.python.length, 0);
    queueMicrotask(() => setExerciseIndex(choices[0] ?? 0));
    exerciseBags.current.python = choices.slice(1);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setBest(readBest(userId, mode)));
  }, [mode, userId]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      if (startedAtRef.current === null) return;
      const nextElapsed = Date.now() - startedAtRef.current;
      if (isLanguageMode && nextElapsed >= timeLimitMs) {
        const resultSpeed = Math.round((typed.length / timeLimitMs) * 60_000);
        const nextIsBest = resultSpeed > best;
        setElapsedMs(timeLimitMs);
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
        awardResult(mode, Math.round(resultSpeed / 5));
        return;
      }
      setElapsedMs(nextElapsed);
    }, 100);
    return () => window.clearInterval(interval);
  }, [best, isLanguageMode, mode, running, timeLimitMs, typed.length, userId]);

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
    setXpMessage("");
    setDailyXp(null);
    awardedAttemptRef.current = "";
    startedAtRef.current = null;
    elapsedRef.current = 0;
    if (codeScrollRef.current) {
      codeScrollRef.current.scrollTop = 0;
      codeScrollRef.current.scrollLeft = 0;
    }
    requestAnimationFrame(() => captureRef.current?.focus({ preventScroll: true }));
  };

  const nextRandomExercise = (nextMode = mode) => {
    if (nextMode === "russian") {
      setRussianText(createRussianText());
      reset("russian", 0);
      return;
    }
    if (nextMode === "english") {
      setEnglishText(createEnglishText());
      reset("english", 0);
      return;
    }
    let bag = exerciseBags.current[nextMode];
    const currentIndex = nextMode === mode ? exerciseIndex : -1;
    if (!bag.length) {
      bag = shuffledIndexes(EXERCISES[nextMode].length, currentIndex);
    }
    const [nextIndex, ...remaining] = bag;
    exerciseBags.current[nextMode] = remaining;
    reset(nextMode, nextIndex ?? 0);
  };

  const selectRussianDuration = (duration: RussianDuration) => {
    setRussianDuration(duration);
    if (mode === "russian") setRussianText(createRussianText());
    if (mode === "english") setEnglishText(createEnglishText());
    reset(mode, 0);
  };

  const restartExercise = () => {
    if (mode === "russian") setRussianText(createRussianText());
    if (mode === "english") setEnglishText(createEnglishText());
    if (mode === "python") {
      nextRandomExercise("python");
      return;
    }
    reset();
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
      awardResult(mode, Math.round(resultSpeed / 5));
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
          <h1>Печатаем код</h1>
          <div className="trainer-controls-row">
            <div className="trainer-modes" aria-label="Режим тренировки">
              {MODE_OPTIONS.map((option) => (
                <button
                  className={mode === option.id ? "is-active" : ""}
                  onClick={() => nextRandomExercise(option.id)}
                  aria-pressed={mode === option.id}
                  key={option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              className="trainer-restart"
              onClick={restartExercise}
              aria-label="Начать упражнение заново"
              title="Начать заново"
            >
              <RotateCcw size={18} strokeWidth={2} />
            </button>
            {isLanguageMode && (
              <div className="trainer-duration" aria-label="Продолжительность тренировки">
                {RUSSIAN_DURATIONS.map((duration) => (
                  <button
                    className={russianDuration === duration ? "is-active" : ""}
                    onClick={() => selectRussianDuration(duration)}
                    aria-pressed={russianDuration === duration}
                    key={duration}
                  >
                    {duration}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="trainer-metrics" aria-label="Текущие показатели">
          <div>
            <span>Время</span>
            <strong>{formatTime(displayedTime)}</strong>
          </div>
          <div>
            <span>Скорость</span>
            <strong>
              {wordSpeed}<small> сл/мин</small>
              <em>{speed} зн/мин</em>
            </strong>
          </div>
          <div>
            <span>Точность</span>
            <strong>{accuracy}%</strong>
          </div>
        </div>
      </section>

      <section className={`trainer-stage ${focused ? "is-focused" : ""} ${completed ? "is-complete" : ""}`}>
        <div className="trainer-stage-toolbar">
          <span>{isLanguageMode ? `Случайный текст · ${russianDuration} секунд` : `Случайное упражнение · ${EXERCISES.python.length} вариантов`}</span>
          <div>
            {best > 0 && (
              <span className="trainer-best">
                Лучший: <b>{Math.round(best / 5)} сл/мин</b>
                <small>{best} зн/мин</small>
              </span>
            )}
            <button onClick={pause} disabled={!running}>Пауза</button>
          </div>
        </div>

        <div className={`trainer-code-scroll ${isLanguageMode ? "is-language" : ""}`} ref={codeScrollRef}>
          {isLanguageMode
            ? <RussianTarget target={target} typed={typed} />
            : <CodeTarget target={target} typed={typed} />}
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

        {!isLanguageMode && !typed && !completed && (
          <div className="trainer-start-note" aria-hidden="true">
            <i />
            <span>Как только начнёте писать, таймер пойдёт</span>
          </div>
        )}

        {isLanguageMode && !completed && (
          <div className="trainer-language-timer" aria-live="polite">
            <span>Осталось</span>
            <strong>{Math.ceil(displayedTime / 1000)}<small> сек</small></strong>
            {!typed && <p>Начните печатать — таймер пойдёт</p>}
          </div>
        )}

        {completed && (
          <section className="trainer-result-overlay" aria-live="polite">
            <div>
              <p className="eyebrow">Результат</p>
              <h2>{isLanguageMode ? "Время вышло!" : "Код набран!"}</h2>
              <p>{isNewBest ? "Новый лучший темп — отличная работа." : "Точность важнее спешки. Попробуйте ещё раз."}</p>
              {xpMessage && <p className="trainer-xp-message">{xpMessage}{dailyXp !== null ? ` · сегодня ${dailyXp}/100 XP` : ""}</p>}
            </div>
            <div className="trainer-result-stats">
              <span className="trainer-result-speed">
                <strong>{wordSpeed}</strong> сл/мин
                <small>{speed} зн/мин</small>
              </span>
              <span><strong>{accuracy}%</strong> точность</span>
              <span><strong>{mistakes}</strong> ошибок</span>
            </div>
            <div className="trainer-result-actions">
              <button onClick={restartExercise}>{isLanguageMode ? "Повторить" : "Новый код"}</button>
              <button
                onClick={() => nextRandomExercise(mode)}
              >
                {isLanguageMode ? "Новый текст" : "Следующее"}
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
