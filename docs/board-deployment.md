# Запуск realtime-досок на VPS

## Обязательные environment variables

```dotenv
DOMAIN=example.ru
SITE_URL=https://example.ru
BOARD_SESSION_SECRET=<random secret, minimum 32 characters>
YANDEX_CLIENT_ID=<yandex oauth client id>
YANDEX_CLIENT_SECRET=<yandex oauth client secret>
```

`BOARD_SESSION_SECRET` должен отличаться от OAuth secret. Его нельзя публиковать в frontend или коммитить.

## Контейнеры

`docker-compose.yml` запускает три сервиса:

- `egege` — Next.js API/UI, SQLite WAL и файлы;
- `realtime` — WebSocket rooms, cursors и live-stroke previews;
- `caddy` — TLS, compression и same-origin proxy.

Caddy отправляет `/boards/realtime` в WebSocket-слой, остальные запросы — в Next.js. Отдельный public port для realtime не нужен.

## Данные и backup

Весь persistent state в текущей single-VPS конфигурации находится в `./data`:

- `egege.sqlite`;
- `egege.sqlite-wal` и `egege.sqlite-shm` во время работы;
- `uploads/boards/...` с оптимизированными WebP и thumbnails.

Нельзя копировать только main SQLite file во время активной записи. Нужен SQLite online backup либо короткая остановка контейнеров перед архивированием всего `data`. Бекап без теста восстановления не считается проверенным.

## Проверки

```bash
npm test
npm run build:sites
npm run board:realtime
npm run board:load -- --scenario=100 --duration=60
```

Последняя команда создаёт 17 rooms по 6 clients (102 WebSocket connections) и имитирует cursor + live drawing events. На production её нужно запускать с явным `BOARD_REALTIME_LOAD_URL=wss://example.ru/boards/realtime` только в согласованное окно нагрузки.

## Ограничение ChatGPT Sites

Sites-сборка осталась работоспособной, но она не запускает отдельный `ws` sidecar. Поэтом production realtime-доска предназначена для VPS-контура. Перенос на Cloudflare Workers потребует Durable Objects и замену Node-only image pipeline.

## Что обязательно проверить на реальных устройствах

- Wacom/Huion: качество письма, реальный pressure и latency;
- iPad Safari + Apple Pencil: pressure, one-finger pan, two-finger pinch, случайные palm/touch events;
- Safari/Chrome/Edge: clipboard image, download names, PNG/PDF export;
- 30–60 минут после потери сети: досылка IndexedDB outbox без reload.
