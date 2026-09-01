import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { classifyRealtimeMessage, createRateState } from "./rate-limiter.mjs";

const port = Number(process.env.REALTIME_PORT || 3001);
const appOrigin = process.env.INTERNAL_APP_ORIGIN || "http://egege:3000";
const secret = process.env.BOARD_SESSION_SECRET || process.env.YANDEX_CLIENT_SECRET || "";
const maxParticipants = 6;
const rooms = new Map();
const counters = { connections: 0, messages: 0, rejected: 0, operations: 0, startedAt: Date.now() };

function decode(value) { return Buffer.from(value, "base64url").toString("utf8"); }
function verifyToken(token) {
  if (!secret || secret.length < 32 || typeof token !== "string" || token.length > 4096) return null;
  const [body, signature] = token.split("."); if (!body || !signature) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const value = JSON.parse(decode(body));
    if (!value || value.expiresAt < Math.floor(Date.now() / 1000) || !/^brd_[a-f0-9]{24}$/.test(value.boardId)) return null;
    return value;
  } catch { return null; }
}
function send(socket, value) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value)); }
function roomFor(boardId) { let room = rooms.get(boardId); if (!room) { room = new Map(); rooms.set(boardId, room); } return room; }
function broadcast(socket, value) {
  const room = rooms.get(socket.identity?.boardId); if (!room) return;
  const payload = JSON.stringify(value);
  for (const peer of room.values()) if (peer !== socket && peer.readyState === WebSocket.OPEN && peer.bufferedAmount < 1_000_000) peer.send(payload);
}
function participants(room) { return Array.from(room.values()).map((peer) => ({ clientId: peer.identity.clientId, name: peer.identity.displayName })); }
function leave(socket) {
  const identity = socket.identity; if (!identity) return;
  const room = rooms.get(identity.boardId); room?.delete(identity.clientId); counters.connections = Math.max(0, counters.connections - 1);
  if (!room?.size) rooms.delete(identity.boardId);
  else broadcast(socket, { type: "participant-left", clientId: identity.clientId, participants: participants(room) });
  socket.identity = null;
}

const httpServer = createServer((request, response) => {
  if (request.url === "/health") { response.writeHead(200, { "content-type": "application/json" }); response.end(JSON.stringify({ ok: true, connections: counters.connections, rooms: rooms.size })); return; }
  if (request.url === "/metrics") { response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); response.end(JSON.stringify({ ...counters, rooms: rooms.size })); return; }
  response.writeHead(404); response.end("Not found");
});
const wss = new WebSocketServer({ server: httpServer, maxPayload: 1_600_000, perMessageDeflate: false });

wss.on("connection", (socket) => {
  socket.identity = null; socket.rate = createRateState();
  const joinTimer = setTimeout(() => { send(socket, { type: "error", code: "join-timeout", message: "Не удалось подключиться к доске" }); socket.close(4001); }, 5000);
  socket.on("message", async (raw) => {
    counters.messages += 1;
    const now = Date.now();
    let message; try { message = JSON.parse(raw.toString()); } catch { counters.rejected += 1; return; }
    const rateAction = classifyRealtimeMessage(socket.rate, message.type, now);
    if (rateAction !== "accept") {
      counters.rejected += 1;
      if (rateAction === "warn") send(socket, { type: "error", code: "rate-limit", message: "Слишком много событий" });
      return;
    }
    if (!socket.identity) {
      if (message.type !== "join") return;
      const identity = verifyToken(message.token); if (!identity) { send(socket, { type: "error", code: "invalid-session", message: "Сеанс доски истёк" }); socket.close(4002); return; }
      const room = roomFor(identity.boardId);
      if (!room.has(identity.clientId) && room.size >= maxParticipants) { send(socket, { type: "error", code: "participant-limit", message: "На доске уже 6 участников. Попробуйте позже." }); socket.close(4004); return; }
      const previous = room.get(identity.clientId); if (previous && previous !== socket) previous.close(4003);
      socket.identity = identity; room.set(identity.clientId, socket); counters.connections += 1; clearTimeout(joinTimer);
      send(socket, { type: "joined", clientId: identity.clientId, participants: participants(room) });
      broadcast(socket, { type: "participant-joined", participant: { clientId: identity.clientId, name: identity.displayName }, participants: participants(room) });
      return;
    }
    if (message.type === "cursor") {
      const x = Number(message.x), y = Number(message.y); if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      broadcast(socket, { type: "cursor", clientId: socket.identity.clientId, name: socket.identity.displayName, x, y, at: now }); return;
    }
    if (message.type === "stroke-preview") {
      if (socket.identity.permission !== "edit" || !/^live_[a-zA-Z0-9_-]{8,80}$/.test(message.strokeId) || !Array.isArray(message.points) || message.points.length > 96) return;
      const points = message.points.filter((point) => Array.isArray(point) && point.length >= 3 && point.every(Number.isFinite)).slice(0, 96);
      broadcast(socket, { type: "stroke-preview", clientId: socket.identity.clientId, strokeId: message.strokeId, color: String(message.color).slice(0, 16), size: Math.max(1, Math.min(96, Number(message.size))), points }); return;
    }
    if (message.type === "stroke-end") { broadcast(socket, { type: "stroke-end", clientId: socket.identity.clientId, strokeId: String(message.strokeId).slice(0, 100) }); return; }
    if (message.type === "background") {
      if (socket.identity.permission !== "edit") return;
      try {
        const response = await fetch(`${appOrigin}/api/internal/boards/${socket.identity.boardId}/background`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${message.token || ""}` }, body: JSON.stringify({ backgroundType: message.backgroundType, backgroundColor: message.backgroundColor }) });
        const result = await response.json();
        if (response.ok && result.board) broadcast(socket, { type: "background", backgroundType: result.board.backgroundType, backgroundColor: result.board.backgroundColor });
        else send(socket, { type: "error", code: "background-rejected", message: result.error || "Не удалось изменить фон" });
      } catch { send(socket, { type: "error", code: "save-failed", message: "Сервер временно недоступен" }); }
      return;
    }
    if (message.type === "operation") {
      if (socket.identity.permission !== "edit") { counters.rejected += 1; send(socket, { type: "error", code: "view-only", message: "Ссылка разрешает только просмотр" }); return; }
      socket.operationQueue = (socket.operationQueue || Promise.resolve()).then(async () => { try {
        const response = await fetch(`${appOrigin}/api/internal/boards/${socket.identity.boardId}/operation`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${message.token || ""}` }, body: JSON.stringify(message.operation) });
        const result = await response.json();
        if (!response.ok) { counters.rejected += 1; send(socket, { type: "error", code: "operation-rejected", message: result.error || "Изменение отклонено" }); return; }
        counters.operations += 1; send(socket, { type: "operation-ack", operation: result.operation }); broadcast(socket, { type: "operation", operation: result.operation });
      } catch { send(socket, { type: "error", code: "save-failed", message: "Сервер временно недоступен" }); } });
      return;
    }
  });
  socket.on("close", () => { clearTimeout(joinTimer); leave(socket); });
  socket.on("error", () => leave(socket));
});

httpServer.listen(port, "0.0.0.0", () => console.log(`EGEGE board realtime listening on ${port}`));
