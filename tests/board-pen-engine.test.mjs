import test from "node:test";
import assert from "node:assert/strict";
import { PenEngine, smoothStrokePoints } from "../lib/boards/client/pen-engine.ts";

test("real pen pressure remains the primary width signal", () => {
  const light = new PenEngine(); light.begin({ x: 0, y: 0, pressure: 0.15, time: 0, pointerType: "pen" }); light.add({ x: 1, y: 0, pressure: 0.15, time: 10, pointerType: "pen" });
  const heavy = new PenEngine(); heavy.begin({ x: 0, y: 0, pressure: 0.9, time: 0, pointerType: "pen" }); heavy.add({ x: 1, y: 0, pressure: 0.9, time: 10, pointerType: "pen" });
  assert.ok(heavy.value().at(-1).pressure > light.value().at(-1).pressure + 0.45);
});

test("fast movement subtly reduces effective pressure", () => {
  const slow = new PenEngine(); slow.begin({ x: 0, y: 0, pressure: 0.6, time: 0, pointerType: "pen" }); slow.add({ x: 1, y: 0, pressure: 0.6, time: 16, pointerType: "pen" });
  const fast = new PenEngine(); fast.begin({ x: 0, y: 0, pressure: 0.6, time: 0, pointerType: "pen" }); fast.add({ x: 40, y: 0, pressure: 0.6, time: 16, pointerType: "pen" });
  assert.ok(fast.value().at(-1).pressure < slow.value().at(-1).pressure);
  assert.ok(slow.value().at(-1).pressure - fast.value().at(-1).pressure < 0.2);
});

test("mouse uses a stable pressure", () => {
  const mouse = new PenEngine(); mouse.begin({ x: 0, y: 0, pressure: 0, time: 0, pointerType: "mouse" }); mouse.add({ x: 100, y: 0, pressure: 0, time: 5, pointerType: "mouse" });
  assert.deepEqual(mouse.value().map((point) => point.pressure), [0.5, 0.5]);
});

test("sparse mouse samples form a curve rather than a subdivided polygon", () => {
  const source = [[0, 0], [100, 0], [100, 100], [200, 100]].map(([x,y], time) => ({ x, y, time, pressure: .5 }));
  const curve = smoothStrokePoints(source, 4);
  assert.deepEqual(curve[0], [0, 0, .5]);
  assert.deepEqual(curve.at(-1), [200, 100, .5]);
  assert.ok(curve.some(([x,y]) => x > 0 && x < 100 && y > 0 && y < 50));
  assert.ok(curve.every(([x,y,p]) => Number.isFinite(x) && Number.isFinite(y) && Math.abs(p - .5) < 1e-12));
  assert.deepEqual(source.map(p=>[p.x,p.y]), [[0,0],[100,0],[100,100],[200,100]]);
});
