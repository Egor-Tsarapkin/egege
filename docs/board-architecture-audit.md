# Архитектурный аудит интерактивной доски EGEGE

Дата аудита: 21 августа 2026 года.

Статус на момент аудита: исходный код доски ещё не добавлялся. Текущая VPS-сборка проходит production build и 6 release-тестов. ESLint сообщает 0 ошибок и 10 предупреждений. `npm audit --omit=dev` не обнаруживает известных уязвимостей production-зависимостей.

## Основной вывод

Доску следует развивать как часть существующего Next.js-приложения, но realtime вынести в отдельный небольшой Node.js-процесс за тем же Caddy и доменом. Для rendering нужен специализированный гибрид на Canvas 2D: несколько слоёв canvas для фона, сохранённых объектов, живого пера и удалённых preview; DOM используется только для toolbar, диалогов и активного редактирования текста/кода.

Для первой production-версии не нужны CRDT, Redis, WebGL, Fabric.js, Konva, tldraw или отдельная новая система авторизации. Для максимума 6 человек на доске надёжнее и проще authoritative WebSocket server, последовательный operation log, оптимистичные локальные изменения и идемпотентный reconnect/outbox.

## 1. Что обнаружено в текущем проекте

- Frontend: Next.js 16.3.1 App Router, React 19.2.6, TypeScript 5.9, client-side shell в `app/page.tsx`.
- UI: собственный CSS без готовой component library; иконки `lucide-react`; KaTeX и `sanitize-html` для учебного контента.
- Router: физические App Router routes существуют, но основные `/tasks`, `/variants`, `/theory`, `/game`, `/trainer`, `/dashboard` переиспользуют один клиентский shell. Внутри shell навигация дополнительно управляется через `sectionPaths`, `history.pushState` и `popstate`.
- Backend: Next.js Route Handlers в `app/api/**`, выполняемые в том же приложении.
- Persistence API: код обращается к Cloudflare-подобным bindings `env.DB` и `env.FILES`.
- Sites path: Vinext/Cloudflare Worker, D1 и R2 из `.openai/hosting.json`.
- VPS path: Next standalone в Docker; `lib/vps-cloudflare-workers.ts` подменяет D1 на `better-sqlite3`, а R2 — на локальный каталог `/app/data/uploads`.
- Reverse proxy/TLS: Caddy.
- Realtime/WebSocket, Redis, очередей и внешнего error monitoring сейчас нет.
- В рабочей копии есть незакоммиченная миграция с Supabase на локальную Yandex OAuth-схему. Её нельзя перезаписывать или смешивать с доской без учёта текущего состояния.

## 2. Текущий backend

На VPS backend физически работает внутри Node.js container с Next standalone. HTTP-запрос проходит через Caddy в Next на порту 3000. Route Handlers выполняют проверки пользователя, читают и изменяют SQLite и работают с файлами через локальную реализацию `env.FILES`.

Старый Sites path физически исполняется как Cloudflare Worker и использует D1/R2. Он остаётся совместимым путём сборки, но не должен быть основным runtime новой realtime-доски.

Для доски предлагается добавить второй container/process:

- `egege`: существующее Next-приложение и HTTP API;
- `board-realtime`: WebSocket rooms, presence, live strokes, authoritative operation ordering и сохранение операций;
- `caddy`: `/boards/realtime` направляется в `board-realtime`, остальные запросы — в Next.

Так Next standalone не придётся заменять custom server. Caddy штатно проксирует WebSocket upgrade и превращает соединение в двунаправленный tunnel.

## 3. База данных и ORM

- Текущая логическая БД: SQLite schema через Drizzle ORM.
- Sites: Cloudflare D1.
- VPS: один локальный `egege.sqlite`, `better-sqlite3`, WAL mode и foreign keys pragma.
- Реальные runtime-запросы в большинстве server modules написаны как prepared SQL через D1-compatible interface; Drizzle сейчас в основном описывает schema и генерирует migrations.
- Существующие таблицы: auth users/identities/sessions, profiles, access/premium, community, analytics, exam attempts, privacy consents, teacher folders/tasks/variants/files.

SQLite WAL подходит для одного VPS и этой нагрузки: читатели не блокируют writer, но одновременно writer всё равно только один. Поэтому board operations нужно коммитить короткими batched transactions, а не одной транзакцией на каждую точку пера.

## 4. Где хранятся файлы

- Sites: R2 binding `FILES`.
- VPS: `/app/data/uploads` с отдельными metadata-файлами; весь `/app/data` смонтирован как persistent volume.
- Статические материалы ЕГЭ находятся в `public/`.

Board images, thumbnails и exports должны идти через новый `BoardBlobStore` interface. Первая VPS-реализация использует локальный диск. Позже тот же interface можно переключить на S3-compatible storage/R2/MinIO без переписывания canvas или board domain logic.

Изображения доски нельзя хранить BLOB-ами в SQLite. В БД остаются metadata, owner/board, dimensions, content type, size, hash и storage key.

## 5. Авторизация, пользователи и permissions

Фактическая текущая VPS-схема:

- Yandex OAuth с `state` и PKCE;
- HttpOnly cookie `egege_session`, SameSite=Lax, Secure на HTTPS;
- в БД хранится только SHA-256 hash session token;
- session lifetime — 30 дней;
- пользователь представлен существующим `AppUser` и стабильным `user.id`;
- дополнительные профильные данные лежат в `profiles`;
- admin определяется серверным allowlist `ADMIN_EMAILS`;
- premium хранится в `user_access`.

Supabase packages и Supabase auth в текущей рабочей копии удалены. Google login в этой миграции также убран. Отдельный helper ChatGPT Sites auth ещё существует, но текущий VPS UI получает session через `/api/auth/session`.

Для доски не создаётся новая auth-система:

- только существующий авторизованный `AppUser` может создать board;
- `boards.owner_user_id = user.id`;
- owner mutations проверяются на HTTP и WebSocket backend;
- guest получает короткоживущий signed board session после проверки share token и ввода имени;
- guest session содержит `boardId`, permission, `clientId`, display name и expiry;
- guessed board ID без действующей user session или share token не даёт доступа.

Текущая permission-система не является общим ACL: права проверяются отдельно в каждом route по `owner_id`, premium и admin. Для доски нужен небольшой отдельный `BoardAccessService`, но не новая глобальная ролевая система.

## 6. Code Blocks в «Марафоне»

Реализация найдена в `app/ege-marathon.tsx`:

- локальный компонент `PythonCode`;
- простая regex tokenization;
- отдельный список Python keywords и нескольких built-ins;
- визуальный контейнер `.marathon-code` и header `.marathon-code-bar`;
- dark background `#17191d`, header `#202329`, radius 17px;
- mono font из `--font-geist-mono`;
- token colors `.tok-keyword`, `.tok-built-in`, `.tok-string`, `.tok-number`, `.tok-comment`;
- кнопки масштаба и подпись Python.

Компонент сейчас не универсальный: поддерживает только Python, не имеет line numbers, copy, resize/edit contract и не экспортируется. Для доски нужно вынести общий визуальный слой `CodeBlockFrame` и token palette без изменения внешнего вида «Марафона». Для Python можно сохранить текущие цвета. Для Python/C++/JavaScript/Pascal использовать ограниченный client-side tokenizer/highlighter, загружающий только четыре языка; пользовательский код никогда не выполняется и не вставляется как доверенный HTML.

## 7. Canvas/rendering stack

### Сравнение

| Вариант | Плюсы | Критические минусы для этой задачи | Решение |
|---|---|---|---|
| DOM/SVG | Простое редактирование текста и accessibility | Тысячи strokes создают слишком много nodes; pan/zoom и live ink становятся тяжелее | Не использовать как основной renderer |
| Fabric.js | Готовые transforms, selection и objects | Pencil brush ориентирован на фиксированную width/path; pressure, velocity, partial erase и realtime stroke preview всё равно требуют глубокой замены | Не использовать |
| Konva | Scene graph, layers, hit canvas, Transformer | Каждый stroke становится node; hit graph и object overhead растут; pen engine и area eraser всё равно custom; framework дублирует state model | Не использовать в v1 |
| tldraw | Infinite canvas и sync готовы | Собственная UI/data model, production license, избыточный product surface, custom handwriting и визуальная интеграция сложнее | Не использовать |
| Excalidraw | Готовый editor и shapes | Opinionated hand-drawn UX и element model, сложная интеграция требуемого code/pen/realtime | Не использовать |
| PixiJS/WebGL | Очень много GPU-объектов | Нужна tessellation variable-width strokes, сложнее text/code editing и iPad fallback; объём задачи не оправдан | Оставить как будущий fallback только после профилирования |
| Custom Canvas 2D hybrid | Полный контроль над latency, pressure, layers, erasing и format | Нужно реализовать selection/hit testing и transforms | Выбрано |

### Выбранная схема

Несколько viewport-sized canvas вместо физически огромного canvas:

1. background layer — plain/dots/grid/ruled через pattern/математику;
2. committed scene layer — видимые сохранённые objects;
3. live ink layer — локальный stroke в текущем animation frame;
4. remote preview/presence layer — незавершённые strokes и cursors других людей;
5. interaction layer — selection bounds, handles, eraser preview;
6. DOM overlay — активный Text/Code editor и обычные UI controls.

Canvas остаётся размером viewport. Infinite coordinates преобразуются camera matrix; отрицательные coordinates не создают огромный DOM. Для поиска видимых объектов используется spatial hash/grid index в памяти. OffscreenCanvas/Web Worker добавляется как progressive optimization для thumbnails, export и тяжёлого пересчёта, но не становится обязательным условием Apple Pencil path.

React не получает state update на каждый pointermove. Низколатентный engine работает императивно через refs и `requestAnimationFrame`; React управляет toolbar, dialogs, board metadata и status.

## 8. Realtime

Выбран authoritative WebSocket server на Node.js с библиотекой `ws`:

- один room object в памяти на активную board;
- максимум 6 accepted connections проверяется атомарно на сервере;
- cursor и unfinished stroke preview — ephemeral, без DB;
- live points отправляются batched примерно 30 раз/с, а не на каждый browser event;
- finalized action получает client operation ID, проверяется, записывается одной transaction, получает монотонный board sequence и только затем подтверждается;
- сервер рассылает операции остальным участникам;
- повторная операция с тем же ID идемпотентна;
- сервер проверяет view/edit permission для каждого mutation message;
- message schemas, sizes, coordinates, point count и rates ограничиваются до применения.

CRDT/Yjs не выбран для v1. При 6 людях object-level authoritative operations проще валидировать, ограничивать, хранить в истории и согласовать с owner/view permissions. Live stroke preview всё равно был бы отдельным ephemeral protocol. CRDT можно рассмотреть позднее только если появится реальное одновременное редактирование одного текстового объекта многими людьми.

Конфликты:

- server sequence задаёт единый порядок;
- delete выигрывает у позднего move/resize;
- update содержит expected object version;
- при version mismatch сервер отклоняет или применяет безопасный property-level rebase;
- активное редактирование текста/кода использует короткую ephemeral lease; при потере lease изменения не затираются молча;
- undo не откатывает глобальное состояние назад, а создаёт новую inverse operation только для действия данного пользователя.

## 9. Pressure-sensitive pen

Input pipeline:

`Pointer Events → coalesced samples → local coordinate transform → resampling → pressure/speed filters → variable-width outline → live Canvas 2D`

- Для `pointerType === "pen"` используется реальный `PointerEvent.pressure` от 0 до 1.
- Для мыши значение `pressure = 0.5` не считается реальным pressure: width остаётся стабильной.
- `getCoalescedEvents()` используется при наличии; fallback — сам pointer event.
- Pointer capture удерживает stroke за пределами элемента.
- Centerline resampling убирает зависимость от частоты устройства.
- Pressure проходит clamp, easing и exponential moving average.
- Velocity считается по расстоянию и timestamp, также сглаживается.
- Pressure остаётся главным сигналом; velocity даёт ограниченную коррекцию, обычно не более 15–20% width.
- Outline строится как polygon с нормалями, round caps и taper. Для базовой геометрии допустимо использовать маленькое ядро `perfect-freehand`, но effective pressure рассчитывается нашим engine, потому что библиотека при реальном pressure сама не смешивает его с velocity.

Начальная модель для калибровки, а не окончательная «магическая формула»:

`effective = pressureCurve(smoothedPressure) × velocityFactor(smoothedVelocity)`

`width = baseSize × clamp(effective, minFactor, maxFactor)`

Параметры должны пройти реальные тесты Wacom/Huion/Apple Pencil. Критерий — внешний вид письма, а не формальное чтение pressure.

iPad:

- pen рисует;
- один `touch` pan;
- два touch pointers pinch/zoom;
- `touch-action: none` только на board surface;
- touch, появившийся во время активного pen stroke рядом с пером, игнорируется как вероятная ладонь;
- обещать hardware-level palm rejection нельзя: браузер не предоставляет полноценный системный API.

## 10. Хранение stroke

Один stroke — один логический object, а не набор database rows.

В памяти point содержит `x`, `y`, normalized pressure и delta time. При finalize:

- удаляются почти совпадающие points;
- coordinates quantize до 1/16 world pixel;
- первая точка абсолютная, остальные delta encoded;
- pressure хранится как UInt8;
- delta time — compact UInt8/UInt16;
- bounds и total length рассчитываются отдельно;
- payload сохраняется compact binary BLOB с versioned codec.

Читаемый TypeScript codec и round-trip tests важнее чрезмерного сжатия. Typical finalized stroke после resampling должен занимать сотни байт, а не десятки rows или большой JSON.

Area eraser работает по centerline segments и radius. Пересечённый stroke разбивается на 0–N новых strokes в одной atomic operation; stroke eraser создаёт обычную delete operation.

## 11. Autosave

Кнопки «Сохранить» не будет.

- pointer preview не пишется в DB;
- finalized stroke/object transform/text edit/insert/delete — durable operation;
- локальное действие применяется оптимистично мгновенно;
- operation остаётся в IndexedDB outbox до server ack;
- сервер в короткой transaction обновляет current object state, board sequence/updatedAt и operation log;
- несколько готовых operations могут коммититься batch за 20–50 мс;
- background/thumbnail update выполняется отдельно и не блокирует перо.

Периодический snapshot: ориентир каждые 2 000 durable operations или 30 минут активной работы, плюс snapshot перед history restore. Images не копируются в snapshot: сохраняются ссылки на immutable assets. History хранится 30 дней.

## 12. Reconnect/offline

Client хранит:

- последнюю принятую server sequence;
- подтверждённое board state cache;
- pending finalized operations в IndexedDB;
- локальный client ID и operation IDs.

Reconnect handshake передаёт `lastAckSequence`:

1. сервер отдаёт пропущенные operations;
2. если разрыв слишком большой — ближайший snapshot + operations после него;
3. client переигрывает pending outbox;
4. сервер дедуплицирует по operation ID;
5. rejected conflicts показываются человеку и не исчезают молча;
6. после полной синхронизации UI меняет «Соединение потеряно/Синхронизация…» на нормальный status.

Незавершённый stroke при физическом disconnect можно завершить локально и положить в outbox. `location.reload()` не используется.

## 13. Предлагаемая data model

### `boards`

- `id` — случайный публичный ID, не являющийся секретом;
- `owner_user_id`;
- `title`;
- `background_type`, `background_color`;
- `latest_sequence`;
- `storage_bytes`, `object_count`, `stroke_count`;
- `created_at`, `updated_at`, `deleted_at`.

Indexes: owner + updated; deleted partial index.

### `board_share_links`

- `id`;
- `board_id`;
- `token_hash` unique;
- `permission` (`view`/`edit`);
- `created_at`, `updated_at`, `revoked_at`.

Raw token показывается только в URL и не хранится в БД. Можно отозвать/перевыпустить link.

### `board_objects`

- `board_id`, `object_id` composite key;
- `kind` (`stroke`, `text`, `line`, `arrow`, `rectangle`, `ellipse`, `image`, `code`);
- `version`, `z_index`;
- `min_x`, `min_y`, `max_x`, `max_y`;
- `payload` versioned BLOB/JSON;
- `created_by`, `created_at`, `updated_at`, `deleted_at`.

### `board_operations`

- `board_id`, `sequence` composite key;
- `operation_id` unique per board;
- actor user/client identity;
- operation type, target ID, payload/inverse payload;
- `created_at`.

Indexes: board + sequence; board + createdAt for 30-day cleanup.

### `board_snapshots`

- `id`, `board_id`, `sequence`;
- compressed snapshot payload or storage key;
- object/stroke counts;
- reason (`periodic`, `before_restore`, `manual_restore`);
- `created_at`, expiry.

### `board_assets`

- `id`, `board_id`, `storage_key` unique;
- MIME, width, height, size, sha256;
- thumbnail key;
- uploader identity;
- created/deleted timestamps.

Board storage limit проверяется transactionally по `storage_bytes`. Backend дополнительно проверяет MIME signature, декодирование, pixel dimensions и 5 MB исходный размер. Разрешены только PNG/JPEG/WebP; GIF/SVG/PDF/video запрещены.

Presence/cursors и active text leases в DB не хранятся.

## 14. Нужна ли внешняя инфраструктура

Для первого production на одном VPS — нет обязательной внешней инфраструктуры.

На application server остаются:

- Next HTTP/API;
- WebSocket room server;
- permission/rate validation;
- image optimization с ограниченной concurrency;
- export jobs первой версии;
- SQLite для A/B при одном сервере.

В object storage желательно вынести:

- board images;
- thumbnails;
- PNG/PDF exports;
- snapshot payloads, если они станут крупными.

В managed PostgreSQL при росте желательно вынести:

- boards, share links, objects metadata;
- operations/history/snapshots metadata;
- quotas и audit information.

Redis:

- Variant A/B на одном realtime instance — не нужен;
- Variant C с несколькими realtime instances — нужен для presence/pub-sub/rate counters либо заменяется consistent room routing и другим message broker.

Отдельный realtime layer нужен уже сейчас, но он может жить вторым container на том же VPS. CDN полезен для immutable images/thumbnails/exports, но не для WebSocket ink messages.

Все integrations создаются через interfaces (`BoardRepository`, `BoardBlobStore`, `RealtimeBus`), без покупки или подключения платных сервисов.

## 15. Ограничения ChatGPT Sites

Текущая Sites-конфигурация проекта декларирует только D1 и R2. В проекте нет Durable Object binding или другого room-affinity механизма.

Обычный Cloudflare Worker может принять WebSocket, но несколько соединений общей доски должны попасть в один authoritative coordinator. Cloudflare для этого рекомендует Durable Objects. Без такого binding разные isolates не имеют общей памяти комнаты, а D1 не заменяет low-latency broadcast. D1 также обрабатывает запросы одной базы последовательно и имеет ограничения free tier по объёму/queries.

Следовательно:

- Sites остаётся допустимым legacy/static deployment path;
- production collaboration работает на VPS;
- если когда-нибудь потребуется вернуть realtime на Cloudflare, нужен отдельный Durable Objects service и явно настроенные bindings, что выходит за текущую Sites-конфигурацию;
- R2/D1 adapters сохраняются, но это не повод связывать renderer с Cloudflare APIs.

## 16. Нагрузка и сервер примерно для 100 пользователей

### Расчётные допущения

- до 100 открытых WebSocket connections;
- до 6 connections в room;
- live ink batches — около 30 сообщений/с на активно рисующего;
- один batch содержит несколько coalesced points;
- compact binary preview примерно 60–140 bytes без TLS overhead;
- cursor update — до 10/с, с suppress при отсутствии движения;
- finalized strokes — примерно 1–3/с на активно пишущего в тяжёлом сценарии;
- изображения после оптимизации обычно 0.3–1.5 MB каждое;
- типичная board 5–30 MB, абсолютный asset limit 100 MB.

### Realtime events и сеть

| Сценарий | Inbound live batches | Outbound fan-out | Оценка трафика |
|---|---:|---:|---:|
| 1 board × 2, рисует 1 | ~30 msg/s | ~30 msg/s | существенно меньше 1 Mbps |
| 1 board × 6, рисует 1–2 | 30–60 msg/s | 150–300 msg/s | обычно меньше 1–2 Mbps |
| 10 boards × 6, по 1 активному pen | ~300 msg/s | ~1 500 msg/s | ориентир 2–5 Mbps |
| 100 connected, все одновременно рисуют | ~3 000 msg/s | до ~15 000 msg/s | ориентир 20–40 Mbps compact; JSON может увеличить в несколько раз |

Upload/export traffic считается отдельно. Один 5 MB upload на 20 пользователей — кратковременные 100 MB входящего трафика. CDN/object storage снижает повторную выдачу images, но не нужен для stroke events.

### DB и storage

- Pointer samples не создают DB writes.
- 100 активно рисующих дают приблизительно 100–300 finalized operations/s в искусственном worst case.
- Batching 20–50 мс сводит это к десяткам коротких transactions/s.
- Реальный учебный сценарий обычно намного легче: одновременно активно пишет часть пользователей.
- 5 000 compact strokes обычно занимают единицы MB; images доминируют над vector data.
- 1 000 типичных boards по 10–20 MB требуют 10–20 GB assets плюс backups/history; theoretical maximum по quota — 100 GB.

### Variant A — минимальный production

Для первых десятков активных пользователей:

- 2 vCPU;
- 4 GB RAM;
- 80 GB NVMe SSD;
- 1 Gbps port, ориентир от 1 TB traffic/месяц;
- один VPS: Next + realtime + SQLite WAL + local files;
- ежедневный off-server backup всей БД и uploads;
- Redis не нужен.

2 GB RAM возможно, но не рекомендуется: production build, image optimization и export легко создают пики памяти.

### Variant B — рекомендуемый для ~100 online users

- 4 vCPU;
- 8 GB RAM;
- 160 GB NVMe SSD либо 60–80 GB system disk + S3-compatible object storage;
- 1 Gbps port, ориентир 2–5 TB traffic/месяц;
- отдельные containers Next/realtime/Caddy;
- SQLite остаётся допустимым на одном host при коротких batched writes;
- object storage и CDN желательны для images/thumbnails/exports;
- автоматический ежедневный backup + проверка восстановления;
- Redis пока не нужен.

Это рекомендуемая стартовая конфигурация. Точные требования нужно подтвердить load test после реализации.

### Variant C — запас на рост/HA

- 2+ application/realtime nodes, каждый ориентировочно 4 vCPU / 8 GB RAM;
- managed PostgreSQL, ориентировочно 2–4 vCPU / 8 GB RAM на старте;
- S3-compatible object storage + CDN;
- Redis/Valkey или broker для presence/pub-sub и distributed rate limits;
- board-ID consistent routing/sticky rooms;
- background worker для thumbnails, exports и cleanup;
- load balancer с WebSocket support;
- metrics и alerts.

Переход к Variant C нужен не из-за 100 sockets как таковых, а когда требуются несколько app instances, zero-downtime/HA, больше одновременных active writers или накопился большой объём history/assets.

## UI и визуальная интеграция

- Текущие tokens: dark theme по умолчанию, light theme через `[data-theme="light"]`, 15 accent palettes через `[data-accent]`.
- Основные fonts: system sans и system mono CSS variables.
- Основные surfaces/borders/text/accent уже заданы `--bg`, `--surface`, `--surface-raised`, `--surface-soft`, `--line`, `--text`, `--muted`, `--accent`.
- Breakpoints не централизованы: в большом `globals.css` используются 350/380/390/430/560/600/620/640/680/700/720/760/780/820/900/1040/1120/1180/1240/1279 и другие контекстные границы. Для доски нужно ограничиться собственными 700/900 boundaries и capability checks, а не добавлять ещё одну произвольную матрицу.
- Phone (`<=620px`) получает view-only shell; tablet/iPad сохраняет editing.
- iPad определяется не только шириной: editing доступен при достаточном viewport и Pointer Events; gesture behavior определяется `pointerType` и количеством active touch pointers.
- Новый раздел «Доски» добавляется в текущую navigation. Board detail должен быть отдельным route `/boards/[boardId]`, потому что это fullscreen application surface, а не ещё одно состояние огромного `app/page.tsx`.

## План реализации

1. Portable board domain types, binary stroke codec и tests.
2. Миграция и repository/access/storage interfaces.
3. Board list + create/rename/duplicate/delete/search.
4. Fullscreen infinite canvas shell и camera/pan/zoom/background.
5. Pen engine pressure + velocity и tablet calibration harness.
6. Shapes/text/images/code/selection/erasers.
7. Incremental persistence/autosave/undo.
8. WebSocket sidecar, sharing, guests, cursors и participant limit.
9. IndexedDB outbox/reconnect/history.
10. iPad/phone behavior, export, performance profiling и load tests.

## Фактический smoke load-test

21 августа 2026 года локальный WebSocket-слой был проверен коротким 3-секундным прогоном активного рисования. Каждый клиент отправлял cursor и batched stroke-preview примерно 30 раз в секунду.

| Сценарий | Соединения | Доски | Входящие events/s | p95 join |
| --- | ---: | ---: | ---: | ---: |
| 1 × 2 | 2 | 1 | 115 | 13 ms |
| 1 × 6 | 6 | 1 | 344 | 11 ms |
| 10 × 6 | 60 | 10 | 3 440 | 23 ms |
| 17 × 6 | 102 | 17 | 5 848 | 31 ms |

За весь прогон realtime-сервер принял 29 410 сообщений, не отклонил ни одного и после отключения клиентов освободил все rooms/connections. Это smoke-прогон, а не длительный soak-test: перед публичным запуском нужен 30–60-минутный прогон на целевом VPS с наблюдением CPU, RSS, event-loop lag, outbound bandwidth и SQLite write latency.

## Источники для архитектурных решений

- Pointer pressure: https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pressure
- Coalesced events: https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents
- Pointer capture/touch action: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events и https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- Canvas layering/offscreen optimization: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- `perfect-freehand` pressure model: https://github.com/steveruizok/perfect-freehand
- Caddy WebSocket proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- SQLite WAL concurrency: https://sqlite.org/wal.html
- Cloudflare realtime coordination: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/
