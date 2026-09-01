import test from "node:test";
import assert from "node:assert/strict";

process.env.BOARD_SESSION_SECRET = "test-only-board-session-secret-at-least-32-chars";
const { signBoardSession, verifyBoardSession } = await import("../lib/boards/session-token.ts");
const identity = { boardId: "brd_0123456789abcdef01234567", clientId: "cli_0123456789abcdef01234567", actorId: "usr_test", actorKind: "user", displayName: "Tester", permission: "edit", expiresAt: Math.floor(Date.now() / 1000) + 60 };

test("signs and verifies a board session", async () => {
  const token = await signBoardSession(identity); assert.deepEqual(await verifyBoardSession(token), identity);
});

test("rejects tampered and expired board sessions", async () => {
  const token = await signBoardSession(identity); assert.equal(await verifyBoardSession(`${token.slice(0, -1)}x`), null);
  assert.equal(await verifyBoardSession(await signBoardSession({ ...identity, expiresAt: 1 })), null);
});
