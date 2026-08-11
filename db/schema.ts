import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    avatarEmoji: text("avatar_emoji").notNull().default("🙂"),
    xp: integer("xp").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    suspicionScore: integer("suspicion_score").notNull().default(0),
    rateLimitedUntil: integer("rate_limited_until").notNull().default(0),
    lastAwardAt: integer("last_award_at").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("profiles_username_unique").on(table.username),
    index("profiles_xp_idx").on(table.xp),
  ],
);

export const scoreEvents = sqliteTable(
  "score_events",
  {
    userId: text("user_id").notNull(),
    taskId: text("task_id").notNull(),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    reason: text("reason").notNull(),
    dateKey: text("date_key").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.taskId] }),
    index("score_events_user_created_idx").on(table.userId, table.createdAt),
    index("score_events_user_date_idx").on(table.userId, table.dateKey),
  ],
);

export const friendships = sqliteTable(
  "friendships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pairKey: text("pair_key").notNull(),
    requesterId: text("requester_id").notNull(),
    addresseeId: text("addressee_id").notNull(),
    status: text("status", { enum: ["pending", "accepted"] }).notNull().default("pending"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("friendships_pair_unique").on(table.pairKey),
    index("friendships_requester_idx").on(table.requesterId, table.status),
    index("friendships_addressee_idx").on(table.addresseeId, table.status),
  ],
);

export const theoryInterest = sqliteTable("theory_interest", {
  userId: text("user_id").primaryKey(),
  createdAt: integer("created_at").notNull(),
});
