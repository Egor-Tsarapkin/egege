import assert from "node:assert/strict";
import test from "node:test";
import { reconcileTypingInput } from "../lib/typing-progress.ts";
import { streakSummary } from "../lib/streaks.ts";

test("a wrong key does not shift every following character", () => {
  const wrong = reconcileTypingInput("при", "прио", "привет");
  assert.deepEqual(wrong, { value: "прио", keystrokes: 1, mistakes: 1 });
  const continued = reconcileTypingInput(wrong.value, `${wrong.value}е`, "привет");
  assert.deepEqual(continued, { value: "приое", keystrokes: 1, mistakes: 0 });
});

test("the same correction rule works for code and multi-character input", () => {
  assert.deepEqual(
    reconcileTypingInput("print(", "print(x\"", "print(\"ok\")"),
    { value: "print(x\"", keystrokes: 2, mistakes: 2 },
  );
});

test("Russian, English and Python input advance after a highlighted mistake", () => {
  for (const target of ["скорость", "accuracy", "print(value)"]) {
    const prefix = target.slice(0, 2);
    const wrong = reconcileTypingInput(prefix, `${prefix}#`, target);
    const continued = reconcileTypingInput(wrong.value, `${wrong.value}${target[3]}`, target);
    assert.equal(wrong.value, `${prefix}#`);
    assert.equal(wrong.mistakes, 1);
    assert.equal(continued.value, `${prefix}#${target[3]}`);
    assert.equal(continued.mistakes, 0);
  }
});

test("current streak survives an unfinished today while its flame stays off", () => {
  assert.deepEqual(
    streakSummary(["2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"], "2026-09-07"),
    { currentStreak: 4, longestStreak: 4, todayActive: false },
  );
});

test("today lights the flame and an older gap ends the current streak", () => {
  assert.deepEqual(
    streakSummary(["2026-09-01", "2026-09-02", "2026-09-06", "2026-09-07"], "2026-09-07"),
    { currentStreak: 2, longestStreak: 2, todayActive: true },
  );
  assert.equal(streakSummary(["2026-09-04"], "2026-09-07").currentStreak, 0);
});
