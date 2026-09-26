import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import WebSocket from "ws";

const secret = "reconnect-regression-test-secret-000000000";
const boardId = `brd_${"a".repeat(24)}`;
const clientId = (letter) => `cli_${letter.repeat(24)}`;
function token(id) {
  const body = Buffer.from(JSON.stringify({ boardId, clientId: id, displayName: id,
    actorId: id, actorKind: "guest", permission: "edit", expiresAt: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
function next(socket, type, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off("message", handler); reject(new Error(`Missing ${type}`)); }, 2000);
    function handler(raw) {
      const message = JSON.parse(raw.toString());
      if (message.type === type && predicate(message)) { clearTimeout(timer); socket.off("message", handler); resolve(message); }
    }
    socket.on("message", handler);
  });
}

test("replacement connection remains in the room after the old socket closes", async (t) => {
  const api = createServer(async (request, response) => {
    let body = ""; for await (const chunk of request) body += chunk;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ operation: JSON.parse(body) }));
  });
  api.listen(0, "127.0.0.1"); await once(api, "listening");
  const reservation = createServer(); reservation.listen(0, "127.0.0.1"); await once(reservation, "listening");
  const port = reservation.address().port; await new Promise((resolve) => reservation.close(resolve));
  const server = spawn(process.execPath, ["realtime/server.mjs"], { env: { ...process.env,
    BOARD_SESSION_SECRET: secret, REALTIME_PORT: String(port), INTERNAL_APP_ORIGIN: `http://127.0.0.1:${api.address().port}` }, stdio: ["ignore", "pipe", "pipe"] });
  const sockets = [];
  t.after(async () => { for (const socket of sockets) socket.terminate(); server.kill(); await once(server, "exit"); await new Promise((resolve) => api.close(resolve)); });
  await once(server.stdout, "data");
  async function join(id) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`); sockets.push(socket);
    await once(socket, "open"); const joined = next(socket, "joined");
    socket.send(JSON.stringify({ type: "join", token: token(id) }));
    const message = await joined; return { socket, message };
  }
  const original = await join(clientId("a"));
  const originalClosed = once(original.socket, "close");
  const first = await join(clientId("a"));
  await originalClosed;
  const peer = await join(clientId("b"));
  assert.equal(peer.message.participants.length, 2);
  const departures = [];
  peer.socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type === "participant-left") departures.push(message);
  });
  let current = first;
  for (let index = 0; index < 3; index++) {
    const closed = once(current.socket, "close");
    current = await join(clientId("a"));
    await closed;
    // A server response after close ensures its close handler has finished.
    const health = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json());
    assert.equal(health.connections, 2); assert.equal(health.rooms, 1);
    assert.equal(departures.length, 0, "replacement must not announce a participant departure");
    await new Promise((resolve) => setTimeout(resolve, 25));
    for (const [sender, receiver] of [[current, peer], [peer, current]]) {
      const cursor = next(receiver.socket, "cursor");
      sender.socket.send(JSON.stringify({ type: "cursor", x: index, y: 42 }));
      assert.equal((await cursor).y, 42);
      const operation = { id: `op_${index}_${sender === current ? "a" : "b"}`, type: "delete", objectId: "test-object" };
      const received = next(receiver.socket, "operation"); const ack = next(sender.socket, "operation-ack");
      sender.socket.send(JSON.stringify({ type: "operation", token: token(sender === current ? clientId("a") : clientId("b")), operation }));
      assert.deepEqual((await received).operation, operation); await ack;
    }
  }
  const third = await join(clientId("c"));
  assert.equal(third.message.participants.length, 3);
  const left = next(peer.socket, "participant-left"); current.socket.close();
  assert.equal((await left).participants.length, 2);
});
