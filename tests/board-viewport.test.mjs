import test from 'node:test';
import assert from 'node:assert/strict';
import { zoomAt, screenToWorld, wheelZoomFactor } from '../lib/boards/client/viewport.ts';

test('wheel zoom keeps its original speed and becomes precise with Shift', () => {
  const normal = wheelZoomFactor(-120);
  const precise = wheelZoomFactor(-120, true);
  assert.ok(normal > 2 && normal < 2.3);
  assert.ok(precise > 1 && precise < normal);
  assert.ok(Math.abs(normal * wheelZoomFactor(120) - 1) < 1e-12);
  assert.ok(Math.abs(precise * wheelZoomFactor(120, true) - 1) < 1e-12);
});

test('extended zoom bounds preserve the point under the cursor', () => {
  const viewport = { x: 100, y: 200, zoom: 1 }; const cursor = { x: 250, y: 400 };
  for (const [factor, expected] of [[100,16],[.001,.02]]) {
    const next = zoomAt(viewport,cursor,factor);
    assert.equal(next.zoom,expected);
    assert.deepEqual(screenToWorld(cursor,next),screenToWorld(cursor,viewport));
  }
});
