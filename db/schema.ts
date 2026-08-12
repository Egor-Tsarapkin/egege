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

export const teacherFolders = sqliteTable(
  "teacher_folders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerId: text("owner_id").notNull(),
    parentId: integer("parent_id"),
    kind: text("kind", { enum: ["tasks", "variants"] }).notNull(),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("teacher_folders_owner_kind_parent_idx").on(table.ownerId, table.kind, table.parentId),
  ],
);

export const teacherTasks = sqliteTable(
  "teacher_tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    publicId: text("public_id").notNull(),
    ownerId: text("owner_id").notNull(),
    folderId: integer("folder_id"),
    examNumber: integer("exam_number").notNull(),
    note: text("note").notNull().default(""),
    statementHtml: text("statement_html").notNull(),
    answerType: text("answer_type", { enum: ["field", "table"] }).notNull().default("field"),
    answerJson: text("answer_json").notNull(),
    solutionVideoUrl: text("solution_video_url").notNull().default(""),
    solutionTimecode: integer("solution_timecode").notNull().default(0),
    solutionHtml: text("solution_html").notNull().default(""),
    difficulty: text("difficulty", { enum: ["Базовый", "Средний", "Сложный"] }).notNull().default("Средний"),
    approved: integer("approved", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("teacher_tasks_public_id_unique").on(table.publicId),
    index("teacher_tasks_owner_folder_idx").on(table.ownerId, table.folderId),
    index("teacher_tasks_exam_number_idx").on(table.examNumber, table.createdAt),
  ],
);

export const teacherTaskFiles = sqliteTable(
  "teacher_task_files",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id").notNull(),
    ownerId: text("owner_id").notNull(),
    storageKey: text("storage_key").notNull(),
    name: text("name").notNull(),
    contentType: text("content_type").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("teacher_task_files_storage_key_unique").on(table.storageKey),
    index("teacher_task_files_task_idx").on(table.taskId),
  ],
);

export const teacherVariants = sqliteTable(
  "teacher_variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kim: text("kim").notNull(),
    ownerId: text("owner_id").notNull(),
    folderId: integer("folder_id"),
    title: text("title").notNull(),
    descriptionHtml: text("description_html").notNull().default(""),
    noTime: integer("no_time", { mode: "boolean" }).notNull().default(false),
    hideAnswers: integer("hide_answers", { mode: "boolean" }).notNull().default(false),
    requireAuth: integer("require_auth", { mode: "boolean" }).notNull().default(false),
    oneAttempt: integer("one_attempt", { mode: "boolean" }).notNull().default(false),
    approved: integer("approved", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("teacher_variants_kim_unique").on(table.kim),
    index("teacher_variants_owner_folder_idx").on(table.ownerId, table.folderId),
  ],
);

export const teacherVariantTasks = sqliteTable(
  "teacher_variant_tasks",
  {
    variantId: integer("variant_id").notNull(),
    position: integer("position").notNull(),
    taskPublicId: text("task_public_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.variantId, table.position] }),
    index("teacher_variant_tasks_task_idx").on(table.taskPublicId),
  ],
);

export const teacherVariantAttempts = sqliteTable(
  "teacher_variant_attempts",
  {
    id: text("id").primaryKey(),
    variantId: integer("variant_id").notNull(),
    userId: text("user_id").notNull(),
    studentName: text("student_name").notNull(),
    score: integer("score").notNull(),
    correctCount: integer("correct_count").notNull(),
    answeredCount: integer("answered_count").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    completedAt: text("completed_at").notNull(),
    resultsJson: text("results_json").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("teacher_variant_attempts_variant_created_idx").on(table.variantId, table.createdAt),
    index("teacher_variant_attempts_variant_user_idx").on(table.variantId, table.userId),
  ],
);
