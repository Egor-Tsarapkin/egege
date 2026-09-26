import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import { awardMarathonAnswer } from '../lib/marathon-rewards.ts';
import { restoreMarathonProgress } from '../lib/marathon-progress.ts';
import { shuffleMarathonOptions } from '../lib/marathon-options.ts';
import { examTestScore } from '../lib/exam-score.ts';

test('every correct marathon attempt earns one XP without limits; retries cannot award twice', async () => {
  const sqlite = new Database(':memory:');
  sqlite.exec(`CREATE TABLE profiles(user_id TEXT PRIMARY KEY, xp INTEGER, correct_count INTEGER, updated_at INTEGER);
    INSERT INTO profiles VALUES ('student', 0, 0, 0);
    CREATE TABLE score_events(user_id TEXT, task_id TEXT, xp_awarded INTEGER, reason TEXT, date_key TEXT, created_at INTEGER, UNIQUE(user_id,task_id));`);
  const statement = (sql, values = []) => ({ sql, values, bind: (...next) => statement(sql, next) });
  const db = { prepare: statement, batch: async (items) => sqlite.transaction(() => items.map(({sql, values}) => ({meta: {changes: sqlite.prepare(sql).run(...values).changes}})))() };
  for (let i = 0; i < 100; i++) {
    const id = `attempt-${i}`;
    assert.equal((await awardMarathonAnswer(db, 'student', id, true, '2026-09-15', 1)).awarded, 1);
    assert.equal((await awardMarathonAnswer(db, 'student', id, true, '2026-09-15', 1)).awarded, 0);
  }
  assert.equal((await awardMarathonAnswer(db, 'student', 'wrong', false, '2026-09-15', 1)).awarded, 0);
  assert.deepEqual(sqlite.prepare('SELECT xp, correct_count FROM profiles').get(), {xp: 100, correct_count: 100});
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM score_events').get().n, 100);
  sqlite.close();
});

const progress = (answered, updatedAt) => ({ answered, favorites: [], marathonOrder: [], autoAdvance: true, successEffect: true, ...(updatedAt ? {updatedAt} : {}) });
test('restores recent local answers over stale server progress and preserves deliberate resets', () => {
  const local = progress({'ege-001': 'correct', 'python-002': 'wrong'}, 200);
  const remote = progress({'ege-001': 'correct'}, 100);
  assert.deepEqual(restoreMarathonProgress(local, remote), local);
  assert.deepEqual(restoreMarathonProgress(local, progress({}, 300)), progress({}, 300));
  assert.deepEqual(restoreMarathonProgress(progress({'ege-001': 'correct'}), progress({'python-002': 'correct'})).answered, {'ege-001': 'correct', 'python-002': 'correct'});
});

test('topic answer permutations preserve original answer identities and change on every launch', () => {
  for (const count of [2, 3, 4, 5]) {
    const previous = Array.from({length: count}, (_, i) => i);
    const next = shuffleMarathonOptions(count, previous, () => .99999);
    assert.notDeepEqual(next, previous);
    assert.deepEqual([...next].sort((a,b) => a-b), previous);
    assert.equal(next.filter(index => index === 1).length, 1);
  }
});

test('exam scale stays at 100 for 29 or more primary points, including extended demos', () => {
  assert.equal(examTestScore(0), 0);
  assert.equal(examTestScore(28), 98);
  for (const primary of [29, 30, 31, 32, 33, 40]) assert.equal(examTestScore(primary), 100);
});
