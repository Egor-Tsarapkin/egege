import assert from "node:assert/strict";
import test from "node:test";
import { classifyRealtimeMessage, createRateState } from "../realtime/rate-limiter.mjs";

test("silently limits high-refresh-rate cursor updates", () => {
  const rate = createRateState(0);
  const actions = Array.from({ length: 120 }, (_, index) => classifyRealtimeMessage(rate, "cursor", index * (1_000 / 120)));

  assert.equal(actions.includes("warn"), false);
  assert.ok(actions.filter((action) => action === "accept").length >= 30);
  assert.ok(actions.filter((action) => action === "accept").length <= 42);
});

test("warns once for a true message flood and then drops it silently", () => {
  const rate = createRateState(0);
  const actions = Array.from({ length: 300 }, (_, index) => classifyRealtimeMessage(rate, "operation", index));

  assert.equal(actions.filter((action) => action === "accept").length, 240);
  assert.equal(actions.filter((action) => action === "warn").length, 1);
  assert.equal(actions.filter((action) => action === "drop").length, 59);
});
