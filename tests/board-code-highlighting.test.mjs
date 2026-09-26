import assert from 'node:assert/strict';
import test from 'node:test';
import { highlightCode, codePalette } from '../lib/boards/client/code-highlighting.ts';

test('Python colors individual tokens with PyCharm palette and preserves source', () => {
  const code = 'def f(a, b, m):\n\tif a+b >= 171:\n        return any(a)\n    h = [f(a+1, b, m-1)]\nprint("if 123") # return 9';
  const lines = highlightCode(code, 'python');
  assert.equal(lines.map(line => line.map(segment => segment.text).join('')).join('\n'), code);
  const tokens = lines.flat();
  for (const [text, kind] of [['def','keyword'], ['f','function'], ['171','number'], ['any','builtin'], ['print','builtin'], ['"if 123"','string'], ['# return 9','comment']]) {
    assert.ok(tokens.some(token => token.text.includes(text) && token.color === codePalette[kind]), `${text}: ${kind}`);
  }
  assert.ok(lines[3].some(token => token.text.includes('h') && token.color === codePalette.plain));
});

test('Multiline strings, comments and other board languages retain exact source', () => {
  for (const [language, code] of [['python', 's = """hello\nif 123\n"""\n\n'], ['javascript','const n = 3; // comment\nconsole.log(n);'], ['cpp','#include <iostream>\nint main() { return 42; }'], ['pascal','begin\n  writeln(42);\nend.']]) {
    const lines = highlightCode(code, language);
    assert.equal(lines.map(line => line.map(segment => segment.text).join('')).join('\n'), code);
    assert.ok(lines.flat().some(segment => segment.color !== codePalette.plain));
  }
});
