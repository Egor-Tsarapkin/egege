import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { wrapTextLines } from "../lib/boards/client/text-layout.ts";

test("keeps NumPad zoom and text editing inside the board", async () => {
  const [surface, operations] = await Promise.all([
    readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/boards/operations.ts", import.meta.url), "utf8"),
  ]);

  assert.match(surface, /event\.code === "NumpadAdd" \|\| event\.code === "NumpadSubtract"/);
  assert.match(surface, /event\.preventDefault\(\); changeZoom/);
  assert.match(surface, /className={`board-inline-text/);
  assert.match(surface, /aria-label="Форматирование текста"/);
  assert.match(surface, /editorDraft\?\.kind === "code" && <div className="board-editor-layer"/);
  assert.match(surface, /!editorDraft && selectedIds\.length === 1 && selectedId && <div className="board-layer-actions"/);
  assert.match(operations, /fontWeight: input\.fontWeight === 700 \? 700 : 500/);
  assert.match(operations, /fontStyle: input\.fontStyle === "italic" \? "italic" : "normal"/);
  assert.match(operations, /textAlign: input\.textAlign === "center" \|\| input\.textAlign === "right"/);
});

test("distinguishes click-to-grow text from a dragged wrapping area", async () => {
  const [surface, operations, renderer] = await Promise.all([
    readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/boards/operations.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/boards/client/renderer.ts", import.meta.url), "utf8"),
  ]);
  assert.match(surface, /type: "text"; pointerId: number/);
  assert.match(surface, /Math\.hypot\(dx, dy\) \* viewportRef\.current\.zoom >= 8/);
  assert.match(surface, /autoWidth: true/);
  assert.match(surface, /TEXT_STYLE_STORAGE_KEY/);
  assert.match(surface, /localStorage\.setItem\(TEXT_STYLE_STORAGE_KEY/);
  assert.match(surface, /autoTextSize\(textDraft\.value \|\| "Введите текст", textDraft\)/);
  assert.match(operations, /autoWidth: input\.autoWidth === true/);
  assert.match(renderer, /payload\.autoWidth \? payload\.text\.split/);
});

test("preserves repeated and leading spaces while wrapping", () => {
  const text = "  один     два";
  const lines = wrapTextLines(text, 7, (value) => value.length);
  assert.equal(lines.join(""), text);
  assert.ok(lines.some((line) => line.includes("  ")));
});

test("previews partial text formatting before committing", async () => {
  const surface = await readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8");
  assert.match(surface, /className="board-inline-text-preview"/);
  assert.match(surface, /formattedTextPreview\(textDraft\.value, textDraft\.formats/);
  assert.match(surface, /applyCreate\(object\); setSelection\(""\)/);
});

test("allows replacing the whole font-size value before validating it", async () => {
  const surface = await readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8");
  assert.match(surface, /value=\{fontSizeInput\}/);
  assert.match(surface, /fontSizeInput\.trim\(\).*: 10/);
  assert.match(surface, /min="1" max="160"/);
  assert.doesNotMatch(surface, /Number\(event\.target\.value\) \|\| 10/);
});

test("uses the system clipboard first and pastes near the pointer", async () => {
  const surface = await readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8");
  assert.match(surface, /navigator\.clipboard\.write\(\[new ClipboardItem/);
  assert.match(surface, /new ClipboardItem\(\{ "image\/png": png \}\)/);
  assert.match(surface, /const local = localPoint\(event\); lastPointerScreen\.current = local/);
  assert.match(surface, /const screen = pasteScreenPoint\(520, 260\)/);
  assert.doesNotMatch(surface, /event\.code === "KeyV" && clipboardObjects\.current\.length/);
  assert.match(surface, /if \(image\) \{ event\.preventDefault\(\); if \(editorDraft\) commitEditor\(\)/);
});

test("restores a separate viewport for every board", async () => {
  const surface = await readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8");
  assert.match(surface, /VIEWPORT_STORAGE_PREFIX/);
  assert.match(surface, /const viewportStorageKey = `\$\{VIEWPORT_STORAGE_PREFIX\}\$\{board\.id\}`/);
  assert.match(surface, /localStorage\.setItem\(viewportStorageKey, JSON\.stringify\(viewportRef\.current\)\)/);
  assert.match(surface, /window\.addEventListener\("pagehide", persistViewport\)/);
  assert.match(surface, /document\.addEventListener\("visibilitychange", onVisibilityChange\)/);
  assert.match(surface, /scheduleViewportPersistence\(\)/);
});

test("renders escaped task answer newlines as real line breaks", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /task\.answer\.replace\(\/\\\\n\/g, "\\n"\)/);
  assert.match(css, /\.answer-value\s*\{\s*white-space: pre-line;/);
});
