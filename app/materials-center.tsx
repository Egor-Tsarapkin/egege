"use client";

import { Binary, BookOpen, Braces, Code2, Network, Table2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

type MaterialId = "functions" | "logic" | "formulas" | "fstrings" | "conversion" | "ip";

const materials: Array<{ id: MaterialId; title: string; short: string; icon: typeof BookOpen }> = [
  { id: "functions", title: "Функции и методы", short: "Python", icon: Braces },
  { id: "logic", title: "Таблицы истинности", short: "Логика", icon: Table2 },
  { id: "formulas", title: "4 формулы для №15", short: "Задание 15", icon: Binary },
  { id: "fstrings", title: "f-строки", short: "Python", icon: Code2 },
  { id: "conversion", title: "Перевод из 10-й системы", short: "Системы счисления", icon: Binary },
  { id: "ip", title: "IP-адреса", short: "Задание 13", icon: Network },
];

const clean = (value: string) => value.replaceAll("—", "-").replaceAll("–", "-");
const plain = (value: string) => clean(value).replaceAll("`", "").replace(/\*\*/g, "").replace(/^[^а-яА-Я\w.]+/u, "").trim();
const slug = (value: string) => plain(value).toLowerCase().replace(/[^a-zа-я0-9.]+/giu, "-").replace(/^-|-$/g, "");

function Inline({ children }: { children: string }) {
  const parts = clean(children).split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return <>{parts.map((part, index) => part.startsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>)}</>;
}

function MarkdownArticle({ source, linkedIndex = false }: { source: string; linkedIndex?: boolean }) {
  const blocks = useMemo(() => {
    const lines = source.split("\n");
    const result: React.ReactNode[] = [];
    let index = 0;
    let tableNumber = 0;
    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line.trim() || line.trim() === "---") { index += 1; continue; }
      if (line.startsWith("```")) {
        const language = line.slice(3).trim();
        const code: string[] = [];
        index += 1;
        while (index < lines.length && !lines[index].trim().startsWith("```")) { code.push(lines[index]); index += 1; }
        result.push(<pre className="material-code" data-language={language || "text"} key={`code-${index}`}><code>{clean(code.join("\n"))}</code></pre>);
        index += 1; continue;
      }
      if (line.startsWith("|")) {
        const rows: string[][] = [];
        while (index < lines.length && lines[index].trim().startsWith("|")) {
          const cells = lines[index].trim().slice(1, -1).split("|").map((cell) => cell.trim());
          if (!cells.every((cell) => /^-+$/.test(cell.replaceAll(" ", "")))) rows.push(cells);
          index += 1;
        }
        const currentTable = tableNumber++;
        result.push(<div className="material-table-scroll" key={`table-${index}`}><table><thead><tr>{rows[0]?.map((cell) => <th key={cell}><Inline>{cell}</Inline></th>)}</tr></thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{linkedIndex && currentTable < 2 && cellIndex === 1 ? <a href={`#material-${slug(row[0])}`}>Подробнее <span>↓</span></a> : <Inline>{cell}</Inline>}</td>)}</tr>)}</tbody></table></div>);
        continue;
      }
      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        const text = plain(heading[2]);
        const id = level === 3 ? `material-${slug(text)}` : undefined;
        const Tag = (level <= 1 ? "h2" : level === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
        result.push(<Tag id={id} key={`heading-${index}`}><Inline>{text}</Inline></Tag>);
        index += 1; continue;
      }
      if (/^[-*]\s+/.test(line)) {
        const items: string[] = [];
        while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*[-*]\s+/, "")); index += 1; }
        result.push(<ul key={`list-${index}`}>{items.map((item) => <li key={item}><Inline>{item}</Inline></li>)}</ul>);
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        const items: string[] = [];
        while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*\d+\.\s+/, "")); index += 1; }
        result.push(<ol key={`ordered-${index}`}>{items.map((item) => <li key={item}><Inline>{item}</Inline></li>)}</ol>);
        continue;
      }
      if (line.startsWith(">")) { result.push(<blockquote key={`quote-${index}`}><Inline>{line.replace(/^>\s*/, "")}</Inline></blockquote>); index += 1; continue; }
      if (line.startsWith("!") || line.startsWith("[](")) { index += 1; continue; }
      const paragraph = [line.trim()];
      index += 1;
      while (index < lines.length && lines[index].trim() && !/^(#|```|\||[-*]\s+|\d+\.\s+|>)/.test(lines[index].trim())) { paragraph.push(lines[index].trim()); index += 1; }
      result.push(<p key={`paragraph-${index}`}><Inline>{paragraph.join(" ")}</Inline></p>);
    }
    return result;
  }, [source, linkedIndex]);
  return <article className="material-article">{blocks}</article>;
}

const fStrings = `# f-строки

**f-строки** (форматированные строки) позволяют вставлять переменные и выражения прямо внутрь текста без сложения строк через +.

## Синтаксис

Перед кавычками ставится буква **f**, а переменные или выражения помещаются в фигурные скобки.

\`\`\`python
name = 'Alex'
age = 19
print(f'Привет, {name}! Тебе {age} лет.')
\`\`\`

Результат: \`Привет, Alex! Тебе 19 лет.\`

## Выражения внутри строки

\`\`\`python
a = 5
b = 10
print(f'{a} + {b} = {a + b}')
\`\`\`

## Форматирование чисел

\`\`\`python
pi = 3.14159
print(f'Число Пи: {pi:.2f}')  # 3.14

x = 10
s = f'{x:b}'                # 1010
\`\`\`

## Что важно запомнить

- Перед кавычками всегда должна быть буква \`f\`.
- Всё внутри \`{}\` вычисляется как Python-код.
- f-строки короче и понятнее, чем склеивание через \`+\` и \`str()\`.
`;

const ipGuide = `# IP-адреса для задания №13

В этом разделе только то, что нужно для уверенного решения задания 13.

## Что такое IP-адрес

IP-адрес состоит из **4 байт**, записанных через точку: \`192.168.1.1\`. Один байт содержит 8 бит и принимает значения от 0 до 255.

- \`123.217.0.254\` - корректный адрес.
- \`123.217.0.256\` - некорректный, максимум 255.
- \`0.1.0.0\` - корректный адрес.

## Сеть и узлы

В сети есть адреса устройств (узлы), адрес самой сети и широковещательный адрес. Два адреса всегда зарезервированы: один для сети, второй для broadcast.

> Все узлы являются IP-адресами, но не все IP-адреса являются узлами.

## Маска сети

Маска тоже состоит из 4 байт. В двоичной записи в ней сначала идут только единицы, затем только нули.

\`\`\`text
11111111.11111111.11110000.00000000  # корректно
11111111.11111000.11110000.00000000  # некорректно
\`\`\`

## Как найти адрес сети

Переведите IP и маску в двоичный вид, затем выполните побитовую конъюнкцию. Проще говоря, это нужно **побитово перемножить одно число на другое**: \`1 & 1 = 1\`, во всех остальных случаях получается 0.

\`\`\`text
IP:    120.140.167.28  -> 01111000.10001100.10100111.00011100
Маска: 255.255.240.0   -> 11111111.11111111.11110000.00000000
Сеть:                     01111000.10001100.10100000.00000000
\`\`\`

Получается сеть \`120.140.160.0\`.

## Сколько адресов в сети

Если в двоичной маске **k нулей**, то:

- всех IP-адресов: \`2 ** k\`;
- доступных узлов: \`2 ** k - 2\`.

## Шпаргалка по библиотеке ipaddress

\`\`\`python
from ipaddress import *

# если IP-адрес: 1.2.3.4, а маска: 255.255.255.192, тогда
net = ip_network(f'1.2.3.4/255.255.255.192', 0) # сеть создается так

# или так:
net = ip_network(f'1.2.3.4/26', 0) # потому что в такой маске 26 единиц

print(net) # сеть в виде: адрес сети / количество единиц в маске
print(net[0]) # адрес сети
print(net[-1]) # адрес широкого вещания сети
print(net.netmask) # маска сети
print(net.num_addresses) # количество IP-адресов в сети
print(net.num_addresses - 2) # количество узлов в сети

# получить все IP-адреса сети
for ip in net:
    print(ip)
    b = f'{int(ip):032b}' # или в двоичном представлении
    print(b)
print('-----------------')
# получить все узлы сети
for ip in net.hosts():
    print(ip)

print('-----------------')

# или
for ip in net:
    if net[0] < ip < net[-1]:
         print(ip)

# если IP-адрес: 1.2.3.4
ip = ip_address('1.2.3.4') # его объект создается так
\`\`\`
`;

function LogicGuide() {
  const rows = [[0,0,1,0,0,1,1],[0,1,1,0,1,1,0],[1,0,0,0,1,0,0],[1,1,0,1,1,1,1]];
  const operations = [
    ["И (конъюнкция)", "A ∧ B", "Результат равен 1, только когда оба условия истинны."],
    ["ИЛИ (дизъюнкция)", "A ∨ B", "Достаточно, чтобы хотя бы одно условие было истинным."],
    ["НЕ (отрицание)", "¬A", "Меняет значение на противоположное."],
    ["Следование (импликация)", "A → B", "Ложно только когда A истинно, а B ложно."],
    ["Тождество", "A ≡ B", "Истинно, когда значения одинаковы."],
  ];
  return <article className="material-article"><h2>Таблица истинности</h2><p>Алгебра логики работает с утверждениями, которые могут быть истинными (1) или ложными (0).</p><div className="material-table-scroll"><table><thead><tr>{["A","B","¬A","A ∧ B","A ∨ B","A → B","A ≡ B"].map((cell)=><th key={cell}>{cell}</th>)}</tr></thead><tbody>{rows.map((row)=><tr key={row.join("")}>{row.map((cell,index)=><td key={index}>{cell}</td>)}</tr>)}</tbody></table></div><div className="logic-operation-grid">{operations.map(([title,symbol,description])=><section key={title}><code>{symbol}</code><h3>{title}</h3><p>{description}</p></section>)}</div></article>;
}

function FormulaGuide() {
  const formulas = [["Импликация","A → B = ¬A ∨ B"],["Закон де Моргана","¬(A ∨ B) = ¬A ∧ ¬B"],["Повтор переменной","A ∨ A = A"],["Двойное отрицание","¬¬A = A"]];
  return <article className="material-article"><h2>4 простые формулы для задания №15</h2><p>Эти преобразования помогают упростить логическое выражение перед разбором условий.</p><div className="formula-grid">{formulas.map(([name,value],index)=><section key={name}><span>{index+1}</span><p>{name}</p><strong>{value}</strong></section>)}</div></article>;
}

export default function MaterialsCenter() {
  const [active, setActive] = useState<MaterialId>("functions");
  const [markdown, setMarkdown] = useState<Record<string,string>>({});
  useEffect(() => {
    void Promise.all([["functions","/materials/functions-and-methods.md"],["conversion","/materials/base-conversion.md"]].map(async ([key,url]) => [key, await fetch(url).then((response)=>response.text())] as const)).then((entries)=>setMarkdown(Object.fromEntries(entries)));
  }, []);
  const current = materials.find((item)=>item.id===active)!;
  return <div className="materials-center"><header className="materials-heading"><h1>Материалы &amp; конспекты</h1></header><nav className="materials-tabs" aria-label="Материалы">{materials.map((item)=>{const Icon=item.icon;return <button className={active===item.id?"is-active":""} onClick={()=>{setActive(item.id);window.scrollTo({top:0,behavior:"smooth"});}} key={item.id}><Icon aria-hidden="true"/><span><small>{item.short}</small>{item.title}</span></button>})}</nav><main className="material-reader"><div className="material-reader-head"><span>{current.short}</span><strong>{current.title}</strong></div>{active==="functions"&&(markdown.functions?<MarkdownArticle source={markdown.functions} linkedIndex/>:<div className="materials-loading">Загружаем справочник...</div>)}{active==="logic"&&<LogicGuide/>}{active==="formulas"&&<FormulaGuide/>}{active==="fstrings"&&<MarkdownArticle source={fStrings}/>} {active==="conversion"&&(markdown.conversion?<MarkdownArticle source={markdown.conversion}/>:<div className="materials-loading">Загружаем конспект...</div>)}{active==="ip"&&<MarkdownArticle source={ipGuide}/>}</main></div>;
}
