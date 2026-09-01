import assert from "node:assert/strict";
import test from "node:test";
import { decodeStrokePoints, encodeStrokePoints, strokeBounds } from "../lib/boards/stroke-codec.ts";

test("round-trips pressure strokes with negative coordinates", () => {
  const source = [
    { x: -120.25, y: 44.5, pressure: 0.08, time: 1000 },
    { x: -118.9, y: 45.75, pressure: 0.52, time: 1007 },
    { x: -114.125, y: 48.1, pressure: 0.93, time: 1021 },
  ];
  const encoded = encodeStrokePoints(source);
  const decoded = decodeStrokePoints(encoded);
  assert.equal(decoded.length, source.length);
  decoded.forEach((point, index) => {
    assert.ok(Math.abs(point.x - source[index].x) <= 1 / 16);
    assert.ok(Math.abs(point.y - source[index].y) <= 1 / 16);
    assert.ok(Math.abs(point.pressure - source[index].pressure) <= 1 / 255);
  });
  assert.deepEqual(decoded.map((point) => point.time), [0, 7, 21]);
  assert.ok(encoded.byteLength < JSON.stringify(source).length);
});

test("calculates padded stroke bounds", () => {
  assert.deepEqual(strokeBounds([
    { x: -2.2, y: 4.1, pressure: 0.5, time: 0 },
    { x: 8.6, y: 9.2, pressure: 0.5, time: 10 },
  ], 3), { minX: -6, minY: 1, maxX: 12, maxY: 13 });
});

test("rejects malformed stroke payloads", () => {
  assert.throws(() => decodeStrokePoints(new Uint8Array([1, 2, 3])), /Unsupported/);
  assert.throws(() => encodeStrokePoints([]), /between 1/);
});
