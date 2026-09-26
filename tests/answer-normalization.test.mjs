import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeAnswer } from '../lib/answer-normalization.ts';

test('task 25 screenshot accepts one cell per line and imported escaped newlines', () => {
  const expected = '1202156 4436\\n12001506 44286\\n12131586 44766\\n12421556 45836\\n12711526 46906';
  const cells = ['1202156', '4436', '12001506', '44286', '12131586', '44766', '12421556', '45836', '12711526', '46906'];
  for (const value of [cells, cells.join('\n'), cells.join('\t'), cells.join('\r\n'), cells.join('\u00a0')]) {
    assert.equal(normalizeAnswer(value), normalizeAnswer(expected));
  }
  assert.notEqual(normalizeAnswer(cells.slice(0, -1)), normalizeAnswer(expected));
  assert.notEqual(normalizeAnswer([...cells.slice(0, -1), '46907']), normalizeAnswer(expected));
  assert.notEqual(normalizeAnswer([...cells].reverse()), normalizeAnswer(expected));
});

test('all task 25 reference answers accept displayed whitespace', async () => {
  const tasks = JSON.parse(await readFile(new URL('../public/data/tasks/25.json', import.meta.url), 'utf8'));
  for (const task of tasks) {
    assert.equal(normalizeAnswer(task.answer.replace(/\\n/g, '\n')), normalizeAnswer(task.answer), task.id);
  }
});

test('escaped CRLF, tabs, case and empty values normalize consistently', () => {
  assert.equal(normalizeAnswer('  АБ\\r\\nВ\\tЁ '), normalizeAnswer('аб\nв\tе'));
  assert.equal(normalizeAnswer(undefined), '');
  assert.notEqual(normalizeAnswer('123'), normalizeAnswer('124'));
});
