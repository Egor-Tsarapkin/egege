import test from "node:test";
import assert from "node:assert/strict";
import { detectCode } from "../lib/boards/client/code-detection.ts";

test("detects the Python acceptance example", () => {
  const result = detectCode("for i in range(10):\n    print(i)");
  assert.equal(result.isCode, true);
  assert.equal(result.language, "python");
  assert.ok(result.confidence >= 0.55);
});

test("detects common C++ and Pascal snippets", () => {
  assert.equal(detectCode("#include <iostream>\nint main() { std::cout << 1; }").language, "cpp");
  assert.equal(detectCode("program test;\nbegin\n  writeln(1);\nend.").language, "pascal");
});

test("does not turn ordinary multiline prose into code", () => {
  assert.equal(detectCode("Это обычный текст.\nВ нём нет программы.").isCode, false);
});
