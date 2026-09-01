import { createHmac, randomBytes } from "node:crypto";
import WebSocket from "ws";

const options = Object.fromEntries(process.argv.slice(2).map((item) => item.replace(/^--/, "").split("=")));
const scenario = options.scenario || "2";
const durationMs = Math.max(2_000, Number(options.duration || 15) * 1000);
const url = options.url || process.env.BOARD_REALTIME_LOAD_URL || "ws://127.0.0.1:3001";
const secret = process.env.BOARD_SESSION_SECRET || process.env.YANDEX_CLIENT_SECRET || "";
if (secret.length < 32) throw new Error("Set BOARD_SESSION_SECRET (at least 32 chars)");
const scenarioConfig = { "2": [1, 2], "6": [1, 6], "60": [10, 6], "100": [17, 6] }[scenario];
if (!scenarioConfig) throw new Error("--scenario must be 2, 6, 60 or 100");
const [boardCount, usersPerBoard] = scenarioConfig;

function id(prefix) { return `${prefix}_${randomBytes(12).toString("hex")}`; }
function token(identity) {
  const payload = Buffer.from(JSON.stringify(identity)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
function connect(boardId, userIndex) {
  return new Promise((resolve, reject) => {
    const clientId = id("cli"); const socket = new WebSocket(url); const started = Date.now();
    const session = token({ boardId, clientId, actorId: clientId, actorKind: "guest", displayName: `Load ${userIndex + 1}`, permission: "edit", expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    socket.once("open", () => socket.send(JSON.stringify({ type: "join", token: session })));
    socket.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "joined") resolve({ socket, clientId, joinMs: Date.now() - started }); else if (message.type === "error") reject(new Error(message.message)); });
    socket.once("error", reject);
  });
}

const boards = Array.from({ length: boardCount }, () => id("brd"));
const clients = await Promise.all(boards.flatMap((boardId) => Array.from({ length: usersPerBoard }, (_, index) => connect(boardId, index))));
let sent = 0; const start = Date.now();
const timer = setInterval(() => {
  const elapsed = Date.now() - start;
  clients.forEach(({ socket, clientId }, index) => {
    const x = (elapsed / 4 + index * 17) % 1400; const y = 300 + Math.sin(elapsed / 180 + index) * 180;
    socket.send(JSON.stringify({ type: "cursor", x, y }));
    socket.send(JSON.stringify({ type: "stroke-preview", strokeId: `live_${clientId}`, color: "#161513", size: 5, points: [[x, y, .55], [x + 3, y + 1, .57], [x + 6, y + 2, .54]] })); sent += 2;
  });
}, 33);
await new Promise((resolve) => setTimeout(resolve, durationMs)); clearInterval(timer); clients.forEach(({ socket }) => socket.close());
const joins = clients.map((client) => client.joinMs).sort((a, b) => a - b);
console.log(JSON.stringify({ scenario, connections: clients.length, boards: boardCount, durationSeconds: durationMs / 1000, messagesSent: sent, eventsPerSecond: Math.round(sent / (durationMs / 1000)), joinMs: { p50: joins[Math.floor(joins.length * .5)], p95: joins[Math.floor(joins.length * .95)], max: joins.at(-1) } }, null, 2));
