import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { BoardObjectStore } from "../lib/boards/client/object-store.ts";
import { StrokeOutlineCache, StrokeRenderCache, strokeOutline } from "../lib/boards/client/pen-engine.ts";

function rectangle(id, x, y, width = 40, height = 30, zIndex = 0) {
  return {
    id, kind: "rectangle", version: 1, zIndex,
    minX: x, minY: y, maxX: x + width, maxY: y + height,
    payload: { x, y, width, height, color: "#171613", strokeWidth: 3 },
    createdBy: "test", createdAt: zIndex, updatedAt: zIndex,
  };
}

function overlaps(object, bounds) {
  return object.maxX >= bounds.minX && object.minX <= bounds.maxX
    && object.maxY >= bounds.minY && object.minY <= bounds.maxY;
}

test("spatial store returns the exact visible set in layer order", () => {
  const objects = [
    rectangle("left", -900, 20, 80, 80, 3),
    rectangle("back", 20, 20, 80, 80, 1),
    rectangle("front", 60, 40, 80, 80, 5),
    rectangle("right", 900, 20, 80, 80, 4),
    rectangle("huge", -20_000, -20_000, 40_000, 40_000, 2),
  ];
  const store = new BoardObjectStore(objects);
  assert.deepEqual(store.visible({ minX: 0, minY: 0, maxX: 180, maxY: 140 }).map((item) => item.id), ["back", "huge", "front"]);
  assert.deepEqual(store.topFirst({ minX: 50, minY: 30, maxX: 70, maxY: 60 }).map((item) => item.id), ["front", "huge", "back"]);
});

test("spatial store updates cells, z-order and deletion without stale hits", () => {
  const store = new BoardObjectStore([rectangle("moving", 0, 0, 50, 50, 1), rectangle("fixed", 500, 0, 50, 50, 2)]);
  store.set("moving", rectangle("moving", 480, 0, 50, 50, 8));
  assert.deepEqual(store.visible({ minX: -20, minY: -20, maxX: 80, maxY: 80 }), []);
  assert.deepEqual(store.topFirst({ minX: 470, minY: -20, maxX: 560, maxY: 80 }).map((item) => item.id), ["moving", "fixed"]);
  assert.equal(store.maxZIndex(), 8);
  assert.equal(store.delete("moving"), true);
  assert.deepEqual(store.topFirst({ minX: 470, minY: -20, maxX: 560, maxY: 80 }).map((item) => item.id), ["fixed"]);
  assert.equal(store.maxZIndex(), 2);
});

test("equal layers retain the original stable insertion order", () => {
  const first = rectangle("zeta", 0, 0, 50, 50, 4); first.createdAt = 10;
  const second = rectangle("alpha", 0, 0, 50, 50, 4); second.createdAt = 10;
  const store = new BoardObjectStore([first, second]);
  assert.deepEqual(store.visible({ minX: 0, minY: 0, maxX: 50, maxY: 50 }).map((object) => object.id), ["zeta", "alpha"]);
  assert.deepEqual(store.topFirst({ minX: 0, minY: 0, maxX: 50, maxY: 50 }).map((object) => object.id), ["alpha", "zeta"]);
});

test("10,000-object spatial queries match brute force and stay local", () => {
  const objects = Array.from({ length: 10_000 }, (_, index) => {
    const column = index % 100; const row = Math.floor(index / 100);
    return rectangle(`object-${index}`, column * 160, row * 120, 36, 28, index);
  });
  const store = new BoardObjectStore(objects);
  const queries = Array.from({ length: 250 }, (_, index) => {
    const column = index % 50; const row = Math.floor(index / 50);
    return { minX: column * 240, minY: row * 480, maxX: column * 240 + 800, maxY: row * 480 + 600 };
  });
  const started = performance.now();
  for (const bounds of queries) {
    const expected = objects.filter((object) => overlaps(object, bounds)).sort((a, b) => a.zIndex - b.zIndex).map((object) => object.id);
    assert.deepEqual(store.visible(bounds).map((object) => object.id), expected);
  }
  assert.ok(performance.now() - started < 250, "250 localized queries over 10,000 objects must stay interactive");
});

test("cached stroke outline is pixel-identical and invalidates on geometry changes", () => {
  const cache = new StrokeOutlineCache();
  const points = Array.from({ length: 80 }, (_, index) => ({
    x: index * 3, y: Math.sin(index / 7) * 24, pressure: .35 + index / 200, time: index * 8,
  }));
  const expected = strokeOutline(points, 5);
  const first = cache.get(points, 5);
  const second = cache.get(points, 5);
  assert.deepEqual(first, expected, "optimization must not alter a single outline coordinate");
  assert.equal(second, first, "unchanged strokes must reuse their calculated outline");
  assert.notEqual(cache.get(points, 8), first, "pen size changes must invalidate the outline");
  assert.notEqual(cache.get([...points, { x: 250, y: 0, pressure: .5, time: 700 }], 5), first, "point changes must invalidate the outline");
});

test("cached stroke render path is constructed once without changing its outline", () => {
  const cache = new StrokeRenderCache();
  const points = Array.from({ length: 40 }, (_, index) => ({ x: index * 4, y: Math.cos(index / 5) * 18, pressure: .5, time: index * 9 }));
  let constructions = 0;
  const create = (outline) => { constructions += 1; return { outline }; };
  const first = cache.get(points, 5, create);
  const second = cache.get(points, 5, create);
  assert.equal(second, first);
  assert.equal(constructions, 1);
  assert.deepEqual(first.outline, strokeOutline(points, 5));
});

test("rich task and code DOM is limited to the viewport with overscan", async () => {
  const surface = await readFile(new URL("../app/boards/board-surface.tsx", import.meta.url), "utf8");
  assert.match(surface, /visibleRichObjectIds/);
  assert.match(surface, /viewportBounds\(viewport, size\.width, size\.height, 320\)/);
  assert.doesNotMatch(surface, /Array\.from\(objectsRef\.current\.values\(\)\)\.filter\(\(object\) => object\.kind === "code"/);
  assert.doesNotMatch(surface, /Array\.from\(objectsRef\.current\.values\(\)\)\.filter\(\(object\) => object\.kind === "task"/);
});
