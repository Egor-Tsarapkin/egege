import { env } from "cloudflare:workers";
import type { AppUser } from "@/lib/app-user";
export { authenticatedUser } from "@/lib/local-auth-server";

export type CommunityProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  xp: number;
  correct_count: number;
  suspicion_score: number;
  rate_limited_until: number;
  last_award_at: number;
};

export function communityDb() {
  if (!env.DB) throw new Error("Community database is unavailable");
  return env.DB;
}

function usernameBase(user: AppUser) {
  const metadataName =
    user.user_metadata?.preferred_username ??
    user.user_metadata?.user_name ??
    user.email?.split("@")[0] ??
    "student";
  const normalized = String(metadataName)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return normalized.length >= 3 ? normalized : `student_${user.id.replace(/-/g, "").slice(0, 5)}`;
}

function displayName(user: AppUser) {
  const value =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Ученик EGEGE";
  return String(value).trim().slice(0, 48) || "Ученик EGEGE";
}

export async function ensureCommunityProfile(user: AppUser) {
  const db = communityDb();
  const existing = await db
    .prepare(
      `SELECT user_id, username, display_name, avatar_emoji, xp, correct_count,
              suspicion_score, rate_limited_until, last_award_at
       FROM profiles WHERE user_id = ?`,
    )
    .bind(user.id)
    .first<CommunityProfileRow>();

  const name = displayName(user);
  if (existing) {
    if (existing.display_name !== name) {
      await db
        .prepare("UPDATE profiles SET display_name = ?, updated_at = ? WHERE user_id = ?")
        .bind(name, Math.floor(Date.now() / 1000), user.id)
        .run();
      existing.display_name = name;
    }
    return existing;
  }

  const now = Math.floor(Date.now() / 1000);
  const base = usernameBase(user);
  const firstInsert = await db
    .prepare(
      `INSERT OR IGNORE INTO profiles
       (user_id, username, display_name, avatar_emoji, xp, correct_count,
        suspicion_score, rate_limited_until, last_award_at, created_at, updated_at)
       VALUES (?, ?, ?, '🙂', 0, 0, 0, 0, 0, ?, ?)`,
    )
    .bind(user.id, base, name, now, now)
    .run();

  if (!firstInsert.meta.changes) {
    const suffix = user.id.replace(/-/g, "").slice(0, 5);
    const fallback = `${base.slice(0, Math.max(3, 20 - suffix.length - 1))}_${suffix}`;
    await db
      .prepare(
        `INSERT OR IGNORE INTO profiles
         (user_id, username, display_name, avatar_emoji, xp, correct_count,
          suspicion_score, rate_limited_until, last_award_at, created_at, updated_at)
         VALUES (?, ?, ?, '🙂', 0, 0, 0, 0, 0, ?, ?)`,
      )
      .bind(user.id, fallback, name, now, now)
      .run();
  }

  const created = await db
    .prepare(
      `SELECT user_id, username, display_name, avatar_emoji, xp, correct_count,
              suspicion_score, rate_limited_until, last_award_at
       FROM profiles WHERE user_id = ?`,
    )
    .bind(user.id)
    .first<CommunityProfileRow>();
  if (!created) throw new Error("Could not create community profile");
  return created;
}

export function moscowDateKey(timestamp = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function publicProfile(profile: CommunityProfileRow) {
  return {
    userId: profile.user_id,
    username: profile.username,
    displayName: profile.display_name,
    avatarEmoji: profile.avatar_emoji,
    xp: profile.xp,
    correctCount: profile.correct_count,
    protectionActiveUntil: profile.rate_limited_until,
  };
}
