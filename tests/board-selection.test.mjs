import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hitSelectionHandle, objectHitTest, objectIntersectsSelectionBox, resizeFromHandle, selectionAfterToolChange, selectionHandles } from "../lib/boards/client/selection.ts";
import { wrapTextLines } from "../lib/boards/client/text-layout.ts";
import { indentationAfterEnter } from "../lib/boards/client/code-editor.ts";
import { codeCopyButtonAt } from "../lib/boards/client/code-block.ts";
import { eraserCanHit, eraserHitsObject } from "../lib/boards/client/eraser.ts";
import { snapBounds } from "../lib/boards/client/guides.ts";
import { recognizeHeldStroke, resizeRecognizedShape } from "../lib/boards/client/shape-recognition.ts";
import { constrainedShapePoint } from "../lib/boards/client/geometry.ts";
import { shiftTextFormats } from "../lib/boards/client/text-formatting.ts";

function rectangle() {
  return {
    id: "obj_000000000000000000000000", kind: "rectangle", version: 1, zIndex: 1,
    minX: 10, minY: 20, maxX: 110, maxY: 80,
    payload: { color: "#171613", strokeWidth: 3, x: 10, y: 20, width: 100, height: 60 },
    createdBy: "test", createdAt: 0, updatedAt: 0,
  };
}

test("renders eight resize handles for rectangular objects", () => {
  const handles = selectionHandles(rectangle());
  assert.equal(handles.length, 8);
  assert.deepEqual(handles.find((point) => point.handle === "se"), { handle: "se", x: 110, y: 80 });
  assert.equal(hitSelectionHandle(rectangle(), 111, 81, 1), "se");
});

test("code editor carries indentation and adds a Python block indent", () => {
  assert.equal(indentationAfterEnter("for i in range(10):", 19, "python"), "\n    ");
  assert.equal(indentationAfterEnter("    print(i)", 12, "python"), "\n    ");
  assert.equal(indentationAfterEnter("    if ready:", 13, "python"), "\n        ");
});

test("handwriting erasers ignore board objects", () => {
  const stroke = { kind: "stroke" };
  const image = { kind: "image" };
  assert.equal(eraserCanHit(stroke, "area"), true);
  assert.equal(eraserCanHit(stroke, "stroke"), true);
  assert.equal(eraserCanHit(image, "area"), false);
  assert.equal(eraserCanHit(image, "stroke"), false);
  assert.equal(eraserCanHit(image, "object"), true);
});

test("eraser follows the visible stroke instead of its loose bounding box", () => {
  const stroke = {
    ...rectangle(), kind: "stroke", minX: 0, minY: 0, maxX: 100, maxY: 100,
    payload: { color: "#171613", size: 4, points: [{ x: 0, y: 0 }, { x: 100, y: 100 }] },
  };
  assert.equal(eraserHitsObject(stroke, 50, 50, 14), true);
  assert.equal(eraserHitsObject(stroke, 10, 90, 14), false);
});

test("selection follows visible stroke geometry instead of its bounding box", () => {
  const stroke = {
    ...rectangle(), kind: "stroke", minX: 0, minY: 0, maxX: 100, maxY: 100,
    payload: { color: "#171613", size: 4, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] },
  };
  assert.equal(objectHitTest(stroke, 50, 50, 1), false);
  assert.equal(objectHitTest(stroke, 50, 3, 1), true);
  assert.equal(objectHitTest(stroke, 50, 5, 1), true);
  assert.equal(objectHitTest(stroke, 50, 7, 1), false);
});

test("marquee selection only catches the actual stroke path", () => {
  const stroke = {
    ...rectangle(), kind: "stroke", minX: 0, minY: 0, maxX: 100, maxY: 100,
    payload: { color: "#171613", size: 4, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] },
  };
  assert.equal(objectIntersectsSelectionBox(stroke, { minX: 30, minY: 30, maxX: 70, maxY: 70 }), false);
  assert.equal(objectIntersectsSelectionBox(stroke, { minX: 40, minY: -1, maxX: 60, maxY: 1 }), true);
  assert.equal(objectIntersectsSelectionBox(stroke, { minX: 40, minY: 5, maxX: 60, maxY: 15 }), false);
});

test("outline shapes do not block objects through their empty center", () => {
  assert.equal(objectHitTest(rectangle(), 60, 50, 1), false);
  assert.equal(objectHitTest(rectangle(), 12, 50, 1), true);
});

test("alignment guides snap only to image and text objects", () => {
  const moving = { minX: 94, minY: 20, maxX: 144, maxY: 70 };
  const image = { kind: "image", minX: 100, minY: 100, maxX: 200, maxY: 180 };
  const shape = { kind: "rectangle", minX: 95, minY: 20, maxX: 145, maxY: 70 };
  assert.deepEqual(snapBounds(moving, [image], 8), { dx: 6, dy: 0, guides: { x: 100, y: undefined } });
  assert.deepEqual(snapBounds(moving, [shape], 8), { dx: 0, dy: 0, guides: { x: undefined, y: undefined } });
});

test("recognizes held pen strokes as editable geometry", () => {
  const line = Array.from({ length: 20 }, (_, index) => ({ x: index * 8, y: index * 2 + (index % 2 ? 1 : -1) }));
  assert.equal(recognizeHeldStroke(line)?.kind, "line");
  const ellipse = Array.from({ length: 49 }, (_, index) => { const angle = Math.PI * 2 * index / 48; return { x: 120 + Math.cos(angle) * 80, y: 90 + Math.sin(angle) * 55 }; });
  assert.equal(recognizeHeldStroke(ellipse)?.kind, "ellipse");
  const rectangle = [
    ...Array.from({ length: 11 }, (_, i) => ({ x: i * 12, y: 0 })),
    ...Array.from({ length: 7 }, (_, i) => ({ x: 120, y: i * 10 })),
    ...Array.from({ length: 11 }, (_, i) => ({ x: 120 - i * 12, y: 60 })),
    ...Array.from({ length: 7 }, (_, i) => ({ x: 0, y: 60 - i * 10 })),
  ];
  assert.equal(recognizeHeldStroke(rectangle)?.kind, "rectangle");
});

test("keeps a recognized shape while held and only resizes it", () => {
  const circle = { kind: "ellipse", x: 20, y: 20, width: 80, height: 80 };
  const resized = resizeRecognizedShape(circle, { x: 100, y: 60 }, { x: 140, y: 60 });
  assert.equal(resized.kind, "ellipse");
  assert.equal(resized.width, resized.height);
  assert.ok(resized.width > circle.width);
  assert.deepEqual(resizeRecognizedShape({ kind: "line", startX: 0, startY: 0, endX: 40, endY: 5 }, { x: 40, y: 5 }, { x: 80, y: 20 }), { kind: "line", startX: 0, startY: 0, endX: 80, endY: 20 });
});

test("Shift constrains shapes like a graphics editor", () => {
  assert.deepEqual(constrainedShapePoint("rectangle", 0, 0, 80, 30, true), { x: 80, y: 80 });
  const line = constrainedShapePoint("line", 0, 0, 90, 12, true);
  assert.ok(Math.abs(line.y) < .001);
  assert.equal(constrainedShapePoint("ellipse", 0, 0, 80, 30, false).y, 30);
});

test("Shift keeps an image aspect ratio while resizing", () => {
  const image = { ...rectangle(), kind: "image", minX: 10, minY: 20, maxX: 210, maxY: 120, payload: { assetId: "ast_000000000000000000000000", src: "/image", x: 10, y: 20, width: 200, height: 100 } };
  const resized = resizeFromHandle(image, 310, 150, "se", true);
  assert.equal(resized.payload.width / resized.payload.height, 2);
  assert.equal(resized.minX, 10);
  assert.equal(resized.minY, 20);
});

test("keeps partial text formatting aligned after edits", () => {
  assert.deepEqual(shiftTextFormats("abcdef", "abXXcdef", [{ start: 2, end: 4, color: "#2f6fed" }]), [{ start: 2, end: 6, color: "#2f6fed" }]);
  assert.deepEqual(shiftTextFormats("abcdef", "abef", [{ start: 4, end: 6, fontSize: 40 }]), [{ start: 2, end: 4, fontSize: 40 }]);
});

test("code block copy button occupies the top-right header area", () => {
  const object = { kind: "code", payload: { x: 100, y: 200, width: 540, height: 170 } };
  assert.equal(codeCopyButtonAt(object, 620, 220), true);
  assert.equal(codeCopyButtonAt(object, 580, 220), false);
  assert.equal(codeCopyButtonAt(object, 620, 250), false);
});

test("resizes a shape from any edge while keeping the opposite edge fixed", () => {
  const resized = resizeFromHandle(rectangle(), -20, 50, "w");
  assert.equal(resized.minX, -20);
  assert.equal(resized.maxX, 110);
  assert.deepEqual(resized.payload, { color: "#171613", strokeWidth: 3, x: -20, y: 20, width: 130, height: 60 });
});

test("line endpoints can be moved independently", () => {
  const line = { ...rectangle(), kind: "arrow", payload: { color: "#171613", strokeWidth: 3, startX: 10, startY: 20, endX: 110, endY: 80 } };
  const resized = resizeFromHandle(line, 160, 5, "line-end");
  assert.equal(resized.payload.endX, 160);
  assert.equal(resized.payload.endY, 5);
  assert.equal(resized.maxX, 163);
});

test("switching away from select clears every object selection", () => {
  const tools = ["pan", "pen", "eraser", "text", "rectangle", "ellipse", "star", "line", "arrow", "code"];
  for (const tool of tools) assert.equal(selectionAfterToolChange("selected-object", tool), "");
  assert.equal(selectionAfterToolChange("selected-object", "select"), "selected-object");
});

test("wraps board text instead of horizontally compressing it", () => {
  const lines = wrapTextLines("Скорость печати я просто в шоке", 12, (value) => Array.from(value).length);
  assert.deepEqual(lines, ["Скорость ", "печати я ", "просто в ", "шоке"]);
  assert.deepEqual(wrapTextLines("оченьдлинноеслово", 5, (value) => value.length), ["очень", "длинн", "оесло", "во"]);
});

test("uses one stable line height for formatted text blocks", async () => {
  const renderer = await readFile(new URL("../lib/boards/client/renderer.ts", import.meta.url), "utf8");
  assert.match(renderer, /const lineHeight = Math\.max\(payload\.fontSize, \.\.\.payload\.formats\.map/);
  assert.match(renderer, /y \+= lineHeight/);
  assert.doesNotMatch(renderer, /y \+= line\.height/);
});
