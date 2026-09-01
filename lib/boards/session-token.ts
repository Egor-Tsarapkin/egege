import type { BoardSessionIdentity } from "./types";

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function sessionSecret() {
  const value = process.env.BOARD_SESSION_SECRET || process.env.YANDEX_CLIENT_SECRET || "";
  if (value.length < 32) throw new Error("BOARD_SESSION_SECRET is not configured");
  return value;
}

async function hmac(data: Uint8Array, usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  ).then((key) => ({ key, data }));
}

export async function signBoardSession(identity: BoardSessionIdentity) {
  const payload = base64Url(new TextEncoder().encode(JSON.stringify(identity)));
  const input = new TextEncoder().encode(payload);
  const { key } = await hmac(input, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, input);
  return `${payload}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifyBoardSession(token: string): Promise<BoardSessionIdentity | null> {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const input = new TextEncoder().encode(payload);
    const { key } = await hmac(input, ["verify"]);
    const signatureBytes = decodeBase64Url(signature);
    if (base64Url(signatureBytes) !== signature) return null;
    const payloadBytes = decodeBase64Url(payload);
    if (base64Url(payloadBytes) !== payload) return null;
    const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, input);
    if (!valid) return null;
    const value = JSON.parse(new TextDecoder().decode(payloadBytes)) as BoardSessionIdentity;
    if (
      !/^brd_[a-f0-9]{24}$/.test(value.boardId)
      || !/^cli_[a-f0-9]{24}$/.test(value.clientId)
      || (value.actorKind !== "user" && value.actorKind !== "guest")
      || (value.permission !== "view" && value.permission !== "edit")
      || typeof value.displayName !== "string"
      || value.expiresAt <= Math.floor(Date.now() / 1000)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function newClientId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `cli_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
