import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("creates a standalone VPS build and deployment files", async () => {
  await Promise.all([
    access(new URL("../.next/standalone/server.js", import.meta.url)),
    access(new URL("../Dockerfile", import.meta.url)),
    access(new URL("../docker-compose.yml", import.meta.url)),
    access(new URL("../.env.example", import.meta.url)),
  ]);
});

test("keeps administrator access explicit", async () => {
  const admin = await readFile(new URL("../lib/admin-server.ts", import.meta.url), "utf8");
  assert.doesNotMatch(admin, /ORDER BY created_at ASC LIMIT 1/);
  assert.match(admin, /emails\.length > 0/);
});

test("streams task files from the allowed authoritative host", async () => {
  const route = await readFile(new URL("../app/api/task-file/route.ts", import.meta.url), "utf8");
  assert.match(route, /source\.hostname !== "kompege\.ru"/);
  assert.doesNotMatch(route, /bucket\.head/);
});

test("boards replace export with task search, layers, and 15 MB files", async () => {
  const surface = await readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8");
  const assets = await readFile(new URL("../app/api/boards/[boardId]/assets/route.ts", import.meta.url), "utf8");
  const taskRoute = await readFile(new URL("../app/api/boards/tasks/route.ts", import.meta.url), "utf8");
  const renderer = await readFile(new URL("../lib/boards/client/renderer.ts", import.meta.url), "utf8");
  assert.doesNotMatch(surface, /exportPng|exportPdf|PDFDocument/);
  assert.match(surface, /Найти и вставить/);
  assert.match(surface, /moveLayer\("front"\)/);
  assert.match(surface, /ChevronsDown/);
  assert.match(surface, /images: body\.task\.images/);
  assert.match(surface, /type: "marquee"/);
  assert.match(surface, /selectedIdsRef/);
  assert.match(surface, /event\.code === "KeyA"/);
  assert.match(surface, /event\.code === "KeyC" \|\| event\.code === "KeyX"/);
  assert.match(surface, /window\.addEventListener\("paste", paste\)/);
  assert.doesNotMatch(surface, /event\.code === "KeyV" && clipboardObjects\.current\.length/);
  assert.match(surface, /event\.code === "KeyD"/);
  assert.match(surface, /board-file-actions/);
  assert.doesNotMatch(surface, /fileTarget\?\.kind === "file"/);
  assert.match(assets, /15 \* 1024 \* 1024/);
  assert.match(taskRoute, /task-index\.json/);
  assert.match(taskRoute, /imageSources/);
  assert.match(taskRoute, /html,/);
  assert.match(renderer, /isDarkBackground/);
  assert.match(surface, /board-task-rich-layer/);
  assert.match(surface, /Показать ответ/);
  assert.match(surface, /changeTaskFont/);
  assert.match(surface, /event\.button === 2/);
  assert.match(surface, /resizeFromHandle\(session\.original, world\.x, world\.y, session\.handle, event\.shiftKey\)/);
  assert.match(surface, /eraseAreaPath/);
  assert.match(surface, /saveState !== "saved"/);
  assert.match(surface, /event\.code === "KeyZ"/);
  assert.match(surface, /event\.code === "KeyY"/);
  assert.match(await readFile(new URL("../app/globals.css", import.meta.url), "utf8"), /::-moz-range-thumb/);
});

test("board storage accepts collaborative task, file, and star objects", async () => {
  const [server, operations, migration] = await Promise.all([
    readFile(new URL("../lib/boards/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/boards/operations.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0008_board_object_kinds.sql", import.meta.url), "utf8"),
  ]);
  for (const kind of ["task", "file", "star"]) {
    assert.match(server, new RegExp(`'${kind}'`));
    assert.match(operations, new RegExp(`"${kind}"`));
    assert.match(migration, new RegExp(`'${kind}'`));
  }
  assert.match(server, /board_objects_legacy_kinds/);
});

test("board undo keeps object identity and serializes rapid operations", async () => {
  const [surface, operations, persistence, collaboration, realtime] = await Promise.all([
    readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/boards/operations.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/boards/client/persistence.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/boards/client/collaboration.ts", import.meta.url), "utf8"),
    readFile(new URL("../realtime/server.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(surface, /redo: \(\) => applyCreate\(cloneObject\(object\), false\)/);
  assert.doesNotMatch(surface, /redo: \(\) => applyCreate\(\{ \.\.\.cloneObject\(object\), id: newObjectId\(\) \}/);
  assert.match(operations, /existing && !existing\.deleted_at/);
  assert.match(operations, /WHERE board_objects\.version < excluded\.version/);
  assert.match(persistence, /sort\(\(a, b\) => Number\(a\.order/);
  assert.match(persistence, /async acknowledge\(operationId: string\)/);
  assert.match(collaboration, /type: "operation-ack"/);
  assert.match(realtime, /socket\.operationQueue/);
});

test("keeps the refreshed home stable and simplifies board tiles", async () => {
  const [page, boardList, materials, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/boards/board-list.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/materials-center.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(boardList, /board-preview|board\.objectCount/);
  assert.match(boardList, /aria-label={`Открыть \$\{board\.title\}`}/);
  assert.match(materials, /побитово перемножить одно число на другое/);
  const binaryLines = materials.match(/IP:\s+120\.140\.167\.28[^\n]+\nМаска:[^\n]+\nСеть:[^\n]+/)?.[0].split("\n") ?? [];
  assert.deepEqual(binaryLines.map((line) => line.search(/[01]{8}\./)), [26, 26, 26]);
  assert.match(page, /authResolved && !isRegistered/);
  assert.match(page, /analyticsConsentResolved && analyticsConsent === null/);
  assert.match(css, /@media \(min-width: 601px\) and \(max-width: 820px\)[\s\S]*grid-template-columns: repeat\(6/);
  assert.match(css, /\.dock-item:nth-last-child\(2\)[\s\S]*grid-column: 2 \/ span 2/);
  assert.match(css, /\.dock-item:last-child[\s\S]*grid-column: 4 \/ span 2/);
});

test("keeps section heroes focused on their primary headings", async () => {
  const [page, marathon, trainer, theory, materials, boards] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ege-marathon.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/typing-trainer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/theory-space.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/materials-center.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/boards/board-list.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /eyebrow="(?:Подготовка к ЕГЭ|Экзаменационный режим|Ваш профиль)"/);
  assert.doesNotMatch(marathon, />Тренировка<|Вопросы ЕГЭ и Python в одном спокойном режиме/);
  assert.doesNotMatch(trainer, /<p className="eyebrow">Тренажёр<|Тренируйте скорость, точность и привычные сочетания клавиш/);
  assert.doesNotMatch(theory, /<p className="eyebrow">Учебная система</);
  assert.doesNotMatch(materials, /Справочник EGEGE|Короткие памятки и подробные разборы для подготовки к ЕГЭ/);
  assert.doesNotMatch(boards, /<p className="boards-eyebrow">Рабочее пространство</);
});

test("includes the privacy consent migration", async () => {
  const migration = await readFile(new URL("../drizzle/0004_privacy_consents.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS privacy_consents/);
});

test("uses local OAuth authentication without Supabase", async () => {
  const [auth, migration, page, packageJson] = await Promise.all([
    readFile(new URL("../lib/local-auth-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0005_local_auth.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(auth, /AUTH_SESSION_COOKIE = "egege_session"/);
  assert.match(auth, /token_hash/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_identities/);
  assert.match(page, /\/api\/auth\/yandex\/start/);
  assert.match(page, /Продолжить с Google/);
  assert.doesNotMatch(packageJson, /@supabase/);
});

test("protects the Yandex OAuth callback with state and PKCE", async () => {
  const [start, callback] = await Promise.all([
    readFile(new URL("../app/api/auth/yandex/start/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/yandex/callback/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(start, /code_challenge_method", "S256"/);
  assert.match(start, /force_confirm", "yes"/);
  assert.match(start, /httpOnly: true/);
  assert.match(start, /sameSite: "lax"/);
  assert.match(callback, /returnedState !== oauth\.state/);
  assert.match(callback, /code_verifier: oauth\.verifier/);
  assert.match(callback, /AUTH_SESSION_MAX_AGE/);
  assert.match(callback, /process\.env\.SITE_URL \|\| request\.nextUrl\.origin/);
  assert.doesNotMatch(callback, /new URL\("\/\?auth=success", request\.url\)/);
});

test("protects the Google OAuth callback with state and PKCE", async () => {
  const [start, callback] = await Promise.all([
    readFile(new URL("../app/api/auth/google/start/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth/google/callback/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(start, /prompt", "select_account"/);
  assert.match(start, /code_challenge_method", "S256"/);
  assert.match(start, /process\.env\.SITE_URL \|\| request\.nextUrl\.origin/);
  assert.match(callback, /returnedState !== oauth\.state/);
  assert.match(callback, /code_verifier: oauth\.verifier/);
  assert.match(callback, /provider: "google"/);
});

test("shows a successful message after an OAuth callback", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /authResult === "success"/);
  assert.match(page, /Вы вошли в профиль/);
});

test("offers VK Video for all ten theory lessons", async () => {
  const [theory, config] = await Promise.all([
    readFile(new URL("../app/theory-space.tsx", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
  ]);
  assert.equal((theory.match(/<LessonVideo title=/g) ?? []).length, 10);
  assert.equal((theory.match(/vkSrc="https:\/\/vkvideo\.ru\/video_ext\.php/g) ?? []).length, 10);
  assert.match(theory, /VK Видео/);
  assert.match(config, /frame-src[^"\n]*https:\/\/vkvideo\.ru/);
});
