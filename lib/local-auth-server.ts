import { env } from "cloudflare:workers";
import type { AppUser } from "@/lib/app-user";

export const AUTH_SESSION_COOKIE = "egege_session";
export const AUTH_STATE_COOKIE = "egege_yandex_oauth";
export const GOOGLE_AUTH_STATE_COOKIE = "egege_google_oauth";
export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const AUTH_STATE_MAX_AGE = 60 * 10;

type DbStatement = {
  bind: (...values: unknown[]) => DbStatement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

type RuntimeDb = {
  prepare: (sql: string) => DbStatement;
  batch: (statements: DbStatement[]) => Promise<unknown>;
};

type ExternalIdentity = {
  provider: "yandex" | "google";
  providerUserId: string;
  email: string;
  name: string;
  login?: string;
  avatarUrl?: string;
};

let schemaReady: Promise<void> | null = null;

function authDb() {
  const db = env.DB as unknown as RuntimeDb | undefined;
  if (!db) throw new Error("Authentication database is unavailable");
  return db;
}

export function authProvidersConfigured() {
  return {
    yandex: Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET),
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  };
}

export function authConfigured() {
  const providers = authProvidersConfigured();
  return providers.yandex || providers.google;
}

export function usesSecureCookies(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwardedProtocol === "https" || new URL(request.url).protocol === "https:";
}

export function ensureLocalAuthSchema() {
  if (schemaReady) return schemaReady;
  const db = authDb();
  schemaReady = db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS auth_identities (
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      provider_email TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (provider, provider_user_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS user_access (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      premium INTEGER NOT NULL DEFAULT 0,
      board_limit INTEGER NOT NULL DEFAULT 3,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      last_login_at INTEGER NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS auth_identities_user_idx ON auth_identities(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at)"),
  ]).then(() => undefined).catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

function randomToken(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const item of cookie.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
}

function rowToUser(row: {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
}): AppUser {
  return {
    id: row.id,
    email: row.email || undefined,
    user_metadata: {
      name: row.name || undefined,
      full_name: row.name || undefined,
      avatar_url: row.avatar_url || undefined,
      picture: row.avatar_url || undefined,
    },
  };
}

function isSitesPreviewRequest(request: Request) {
  try {
    return new URL(request.url).hostname.toLowerCase().endsWith(".chatgpt.site");
  } catch {
    return false;
  }
}

async function sitesPreviewUser(request: Request): Promise<AppUser | null> {
  if (!isSitesPreviewRequest(request)) return null;

  const forwardedId = request.headers.get("oai-authenticated-user-id")?.trim() ?? "";
  const forwardedEmail = request.headers.get("oai-authenticated-user-email")?.trim() ?? "";
  const identitySource = forwardedId || forwardedEmail || "anonymous-preview";
  const userId = `sites_${(await sha256(identitySource)).slice(0, 32)}`;

  let forwardedName = "";
  const encodedName = request.headers.get("oai-authenticated-user-full-name")?.trim() ?? "";
  if (
    encodedName &&
    request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8"
  ) {
    try {
      forwardedName = decodeURIComponent(encodedName);
    } catch {
      forwardedName = "";
    }
  }
  const displayName = forwardedName || forwardedEmail.split("@")[0] || "Демо-ученик";

  return {
    id: userId,
    user_metadata: {
      name: displayName,
      full_name: displayName,
    },
  };
}

export async function authenticatedUser(request: Request): Promise<AppUser | null> {
  const previewUser = await sitesPreviewUser(request);
  if (previewUser) return previewUser;

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+([a-f0-9]{64})$/i)?.[1] ?? "";
  const token = cookieValue(request, AUTH_SESSION_COOKIE) || bearer;
  if (!token) return null;

  await ensureLocalAuthSchema();
  const now = Math.floor(Date.now() / 1000);
  const row = await authDb().prepare(`SELECT u.id, u.email, u.name, u.avatar_url
    FROM auth_sessions s
    JOIN auth_users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(await sha256(token), now)
    .first<{ id: string; email: string; name: string; avatar_url: string }>();
  return row ? rowToUser(row) : null;
}

export async function createLocalSession(identity: ExternalIdentity) {
  await ensureLocalAuthSchema();
  const db = authDb();
  const now = Math.floor(Date.now() / 1000);
  const existingIdentity = await db.prepare(`SELECT user_id FROM auth_identities
    WHERE provider = ? AND provider_user_id = ?`)
    .bind(identity.provider, identity.providerUserId)
    .first<{ user_id: string }>();

  let userId = existingIdentity?.user_id ?? "";
  if (!userId && identity.email) {
    const legacy = await db.prepare("SELECT user_id FROM user_access WHERE lower(email) = lower(?) LIMIT 1")
      .bind(identity.email)
      .first<{ user_id: string }>();
    userId = legacy?.user_id ?? "";
  }
  if (!userId) userId = `usr_${randomToken(16)}`;

  await db.prepare(`INSERT INTO auth_users (id, email, name, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      updated_at = excluded.updated_at`)
    .bind(userId, identity.email, identity.name, identity.avatarUrl ?? "", now, now)
    .run();
  await db.prepare(`INSERT INTO auth_identities
    (provider, provider_user_id, user_id, provider_email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_user_id) DO UPDATE SET
      user_id = excluded.user_id,
      provider_email = excluded.provider_email,
      updated_at = excluded.updated_at`)
    .bind(identity.provider, identity.providerUserId, userId, identity.email, now, now)
    .run();

  const token = randomToken();
  const expiresAt = now + AUTH_SESSION_MAX_AGE;
  await db.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(now).run();
  await db.prepare(`INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)`)
    .bind(await sha256(token), userId, expiresAt, now)
    .run();

  return { token, userId, expiresAt };
}

export async function revokeLocalSession(request: Request) {
  const token = cookieValue(request, AUTH_SESSION_COOKIE);
  if (!token) return;
  await ensureLocalAuthSchema();
  await authDb().prepare("DELETE FROM auth_sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .run();
}

export function newOAuthState() {
  return { state: randomToken(24), verifier: randomToken(48) };
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const bytes = String.fromCharCode(...new Uint8Array(digest));
  return btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
