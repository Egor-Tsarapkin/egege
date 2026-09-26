import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import Database from 'better-sqlite3';

test('invited boards persist per account, preserve permission and respect revocation', async () => {
  const sqlite = new Database(':memory:');
  sqlite.exec('CREATE TABLE profiles(user_id TEXT, display_name TEXT); CREATE TABLE auth_users(id TEXT, name TEXT, email TEXT);');
  const db = {
    prepare(sql) {
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async run() { return sqlite.prepare(sql).run(...params); },
        async first() { return sqlite.prepare(sql).get(...params) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...params) }; },
      };
    },
    async batch(statements) { for (const statement of statements) await statement.run(); },
  };
  globalThis.__boardInvitationTest = { communityDb: () => db, authenticatedUser: async request => {
    const id = request.headers.get('x-test-user'); return id ? { id } : null;
  }};
  const source = (await readFile(new URL('../lib/boards/server.ts', import.meta.url), 'utf8'))
    .replace('import { authenticatedUser, communityDb } from "@/lib/community-server";', 'const { authenticatedUser, communityDb } = globalThis.__boardInvitationTest;');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const api = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const request = id => new Request('https://example.test', { headers: id ? { 'x-test-user': id } : {} });
  try {
    const board = await api.createBoard({ id: 'owner' }, 'Lesson');
    const share = await api.rotateBoardShare(board.id, 'view');
    assert.equal(await api.resolveBoardAccess(request('student'), board.id), null);
    assert.equal((await api.resolveBoardAccess(request('student'), board.id, share.token)).permission, 'view');
    assert.equal((await api.resolveBoardAccess(request('student'), board.id)).owner, false);
    assert.equal((await api.listInvitedBoards('student')).length, 1);
    assert.equal((await api.listOwnedBoards('student')).length, 0);
    assert.equal((await api.boardQuota('student')).used, 0);
    assert.equal(await api.requireBoardOwner(request('student'), board.id), null);
    assert.equal(await api.resolveBoardAccess(request('stranger'), board.id), null);
    await api.resolveBoardAccess(request(), board.id, share.token);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM board_invitations').get().n, 1);
    await api.rotateBoardShare(board.id, null);
    assert.equal(await api.resolveBoardAccess(request('student'), board.id), null);
    assert.equal((await api.listInvitedBoards('student')).length, 0);
    const next = await api.rotateBoardShare(board.id, 'edit');
    assert.equal(await api.resolveBoardAccess(request('student'), board.id, share.token), null);
    assert.equal((await api.resolveBoardAccess(request('student'), board.id, next.token)).permission, 'edit');
    assert.equal((await api.listInvitedBoards('student')).length, 1);
    await api.softDeleteBoard(board.id);
    assert.equal((await api.listInvitedBoards('student')).length, 0);
    assert.equal(await api.resolveBoardAccess(request('student'), board.id), null);
  } finally { sqlite.close(); delete globalThis.__boardInvitationTest; }
});
