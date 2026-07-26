import {
  authenticatedUser,
  communityDb,
  ensureCommunityProfile,
  moscowDateKey,
  publicProfile,
  type CommunityProfileRow,
} from "@/lib/community-server";

export const dynamic = "force-dynamic";

const XP_PER_TASK = 10;
const MIN_AWARD_INTERVAL_SECONDS = 12;
const BURST_WINDOW_SECONDS = 5 * 60;
const BURST_AWARD_LIMIT = 8;
const PROTECTION_SECONDS = 10 * 60;

type LeaderboardRow = CommunityProfileRow & { is_friend: number };
type FriendRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  xp: number;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing" | "friend";
};

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function loadCommunity(userId: string, view: "all" | "friends") {
  const db = communityDb();
  const profile = await db
    .prepare(
      `SELECT user_id, username, display_name, avatar_emoji, xp, correct_count,
              suspicion_score, rate_limited_until, last_award_at
       FROM profiles WHERE user_id = ?`,
    )
    .bind(userId)
    .first<CommunityProfileRow>();
  if (!profile) throw new Error("Profile is missing");

  const leaderboardSql =
    view === "friends"
      ? `SELECT p.*,
                CASE WHEN p.user_id = ? THEN 0 ELSE 1 END AS is_friend
         FROM profiles p
         WHERE p.user_id = ?
            OR EXISTS (
              SELECT 1 FROM friendships f
              WHERE f.status = 'accepted'
                AND (
                  (f.requester_id = ? AND f.addressee_id = p.user_id)
                  OR (f.addressee_id = ? AND f.requester_id = p.user_id)
                )
            )
         ORDER BY p.xp DESC, p.correct_count DESC, p.created_at ASC
         LIMIT 50`
      : `SELECT p.*,
                CASE WHEN EXISTS (
                  SELECT 1 FROM friendships f
                  WHERE f.status = 'accepted'
                    AND (
                      (f.requester_id = ? AND f.addressee_id = p.user_id)
                      OR (f.addressee_id = ? AND f.requester_id = p.user_id)
                    )
                ) THEN 1 ELSE 0 END AS is_friend
         FROM profiles p
         ORDER BY p.xp DESC, p.correct_count DESC, p.created_at ASC
         LIMIT 50`;
  const leaderboardQuery = db.prepare(leaderboardSql);
  const leaderboardResult =
    view === "friends"
      ? await leaderboardQuery.bind(userId, userId, userId, userId).all<LeaderboardRow>()
      : await leaderboardQuery.bind(userId, userId).all<LeaderboardRow>();

  const friendResult = await db
    .prepare(
      `SELECT p.user_id, p.username, p.display_name, p.avatar_emoji, p.xp, f.status,
              CASE
                WHEN f.status = 'accepted' THEN 'friend'
                WHEN f.addressee_id = ? THEN 'incoming'
                ELSE 'outgoing'
              END AS direction
       FROM friendships f
       JOIN profiles p
         ON p.user_id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
       WHERE f.requester_id = ? OR f.addressee_id = ?
       ORDER BY CASE f.status WHEN 'pending' THEN 0 ELSE 1 END, p.username`,
    )
    .bind(userId, userId, userId, userId)
    .all<FriendRow>();

  const completedResult = await db
    .prepare("SELECT task_id FROM score_events WHERE user_id = ?")
    .bind(userId)
    .all<{ task_id: string }>();
  const activityResult = await db
    .prepare(
      `SELECT date_key, COUNT(*) AS count
       FROM score_events
       WHERE user_id = ? AND xp_awarded > 0
       GROUP BY date_key`,
    )
    .bind(userId)
    .all<{ date_key: string; count: number }>();

  return {
    profile: publicProfile(profile),
    leaderboard: leaderboardResult.results.map((row: LeaderboardRow, index: number) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarEmoji: row.avatar_emoji,
      xp: row.xp,
      correctCount: row.correct_count,
      isCurrent: row.user_id === userId,
      isFriend: Boolean(row.is_friend),
    })),
    friends: friendResult.results.map((row: FriendRow) => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarEmoji: row.avatar_emoji,
      xp: row.xp,
      status: row.status,
      direction: row.direction,
    })),
    completedTaskIds: completedResult.results.map((row: { task_id: string }) => row.task_id),
    activity: Object.fromEntries(
      activityResult.results.map((row: { date_key: string; count: number }) => [
        row.date_key,
        Number(row.count),
      ]),
    ),
    protection: {
      active: profile.rate_limited_until > Math.floor(Date.now() / 1000),
      until: profile.rate_limited_until,
    },
    view,
  };
}

export async function GET(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return response({ error: "Нужно войти в аккаунт." }, 401);

  try {
    await ensureCommunityProfile(user);
    const view = new URL(request.url).searchParams.get("view") === "friends" ? "friends" : "all";
    return response(await loadCommunity(user.id, view));
  } catch (error) {
    console.error("Community GET failed", error);
    return response({ error: "Рейтинг временно недоступен." }, 503);
  }
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return response({ error: "Нужно войти в аккаунт." }, 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return response({ error: "Некорректный запрос." }, 400);
  }

  try {
    const db = communityDb();
    const profile = await ensureCommunityProfile(user);
    const action = String(body.action ?? "");
    const now = Math.floor(Date.now() / 1000);

    if (action === "claim_xp") {
      const taskId = String(body.taskId ?? "");
      if (!/^\d{1,20}$/.test(taskId)) return response({ error: "Некорректный ID задания." }, 400);

      const existing = await db
        .prepare("SELECT xp_awarded FROM score_events WHERE user_id = ? AND task_id = ?")
        .bind(user.id, taskId)
        .first<{ xp_awarded: number }>();
      if (existing) {
        return response({
          status: "duplicate",
          message: existing.xp_awarded
            ? "За это задание XP уже начислен."
            : "Это задание уже было отмечено.",
          completed: true,
        });
      }

      const dateKey = moscowDateKey();
      if (profile.rate_limited_until > now) {
        await db
          .prepare(
            `INSERT OR IGNORE INTO score_events
             (user_id, task_id, xp_awarded, reason, date_key, created_at)
             VALUES (?, ?, 0, 'protected', ?, ?)`,
          )
          .bind(user.id, taskId, dateKey, now)
          .run();
        return response({
          status: "protected",
          message: "XP временно не начисляется: ответы отмечались слишком быстро.",
          completed: true,
          retryAfter: profile.rate_limited_until,
        });
      }

      const recentAccepted = await db
        .prepare(
          `SELECT COUNT(*) AS count FROM score_events
           WHERE user_id = ? AND xp_awarded > 0 AND created_at >= ?`,
        )
        .bind(user.id, now - BURST_WINDOW_SECONDS)
        .first<{ count: number }>();
      const recentWarnings = await db
        .prepare(
          `SELECT COUNT(*) AS count FROM score_events
           WHERE user_id = ? AND reason IN ('too_fast', 'burst') AND created_at >= ?`,
        )
        .bind(user.id, now - 10 * 60)
        .first<{ count: number }>();

      const tooFast =
        profile.last_award_at > 0 && now - profile.last_award_at < MIN_AWARD_INTERVAL_SECONDS;
      const burst = Number(recentAccepted?.count ?? 0) >= BURST_AWARD_LIMIT;
      if (tooFast || burst) {
        const nextSuspicion = profile.suspicion_score + 1;
        const activateProtection = burst || Number(recentWarnings?.count ?? 0) >= 2;
        const limitedUntil = activateProtection ? now + PROTECTION_SECONDS : 0;
        const reason = burst ? "burst" : "too_fast";

        await db.batch([
          db
            .prepare(
              `INSERT OR IGNORE INTO score_events
               (user_id, task_id, xp_awarded, reason, date_key, created_at)
               VALUES (?, ?, 0, ?, ?, ?)`,
            )
            .bind(user.id, taskId, reason, dateKey, now),
          db
            .prepare(
              `UPDATE profiles
               SET suspicion_score = ?, rate_limited_until = MAX(rate_limited_until, ?), updated_at = ?
               WHERE user_id = ?`,
            )
            .bind(nextSuspicion, limitedUntil, now, user.id),
        ]);
        return response({
          status: activateProtection ? "protected" : "too_fast",
          message: activateProtection
            ? "Защита от накрутки включена на 10 минут."
            : "Слишком быстро: за это задание XP не начислен.",
          completed: true,
          retryAfter: limitedUntil || undefined,
        });
      }

      const insert = await db
        .prepare(
          `INSERT OR IGNORE INTO score_events
           (user_id, task_id, xp_awarded, reason, date_key, created_at)
           VALUES (?, ?, ?, 'accepted', ?, ?)`,
        )
        .bind(user.id, taskId, XP_PER_TASK, dateKey, now)
        .run();
      if (!insert.meta.changes) {
        return response({ status: "duplicate", message: "За это задание XP уже начислен.", completed: true });
      }

      await db
        .prepare(
          `UPDATE profiles
           SET xp = xp + ?, correct_count = correct_count + 1, last_award_at = ?,
               suspicion_score = MAX(0, suspicion_score - 1), updated_at = ?
           WHERE user_id = ?`,
        )
        .bind(XP_PER_TASK, now, now, user.id)
        .run();
      return response({
        status: "awarded",
        message: `+${XP_PER_TASK} XP · записано в рейтинг`,
        completed: true,
        xp: profile.xp + XP_PER_TASK,
        correctCount: profile.correct_count + 1,
        dateKey,
      });
    }

    if (action === "set_username") {
      const username = String(body.username ?? "").trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return response({ error: "Username: 3–20 символов, только a–z, цифры и _." }, 400);
      }
      try {
        await db
          .prepare("UPDATE profiles SET username = ?, updated_at = ? WHERE user_id = ?")
          .bind(username, now, user.id)
          .run();
      } catch {
        return response({ error: "Этот username уже занят." }, 409);
      }
      return response({ status: "updated", message: `Username изменён на @${username}.` });
    }

    if (action === "add_friend") {
      const username = String(body.username ?? "").trim().toLowerCase().replace(/^@/, "");
      const target = await db
        .prepare("SELECT user_id, username FROM profiles WHERE username = ?")
        .bind(username)
        .first<{ user_id: string; username: string }>();
      if (!target) return response({ error: "Пользователь с таким username не найден." }, 404);
      if (target.user_id === user.id) return response({ error: "Нельзя добавить самого себя." }, 400);

      const pairKey = [user.id, target.user_id].sort().join(":");
      const existing = await db
        .prepare(
          "SELECT requester_id, addressee_id, status FROM friendships WHERE pair_key = ?",
        )
        .bind(pairKey)
        .first<{ requester_id: string; addressee_id: string; status: string }>();

      if (existing?.status === "accepted") {
        return response({ status: "already_friends", message: `@${target.username} уже в друзьях.` });
      }
      if (existing && existing.addressee_id === user.id) {
        await db
          .prepare("UPDATE friendships SET status = 'accepted', updated_at = ? WHERE pair_key = ?")
          .bind(now, pairKey)
          .run();
        return response({ status: "accepted", message: `@${target.username} добавлен в друзья.` });
      }
      if (existing) {
        return response({ status: "pending", message: "Заявка уже отправлена." });
      }

      await db
        .prepare(
          `INSERT INTO friendships
           (pair_key, requester_id, addressee_id, status, created_at, updated_at)
           VALUES (?, ?, ?, 'pending', ?, ?)`,
        )
        .bind(pairKey, user.id, target.user_id, now, now)
        .run();
      return response({ status: "pending", message: `Заявка для @${target.username} отправлена.` });
    }

    if (action === "accept_friend" || action === "decline_friend" || action === "remove_friend") {
      const targetUserId = String(body.userId ?? "");
      if (!targetUserId) return response({ error: "Не выбран пользователь." }, 400);
      const pairKey = [user.id, targetUserId].sort().join(":");

      if (action === "accept_friend") {
        const update = await db
          .prepare(
            `UPDATE friendships SET status = 'accepted', updated_at = ?
             WHERE pair_key = ? AND addressee_id = ? AND status = 'pending'`,
          )
          .bind(now, pairKey, user.id)
          .run();
        if (!update.meta.changes) return response({ error: "Заявка уже обработана." }, 409);
        return response({ status: "accepted", message: "Заявка принята." });
      }

      await db
        .prepare("DELETE FROM friendships WHERE pair_key = ? AND (requester_id = ? OR addressee_id = ?)")
        .bind(pairKey, user.id, user.id)
        .run();
      return response({
        status: action === "decline_friend" ? "declined" : "removed",
        message: action === "decline_friend" ? "Заявка отклонена." : "Пользователь удалён из друзей.",
      });
    }

    return response({ error: "Неизвестное действие." }, 400);
  } catch (error) {
    console.error("Community POST failed", error);
    return response({ error: "Не удалось сохранить изменение." }, 503);
  }
}
