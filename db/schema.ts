import { blob, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const authUsers = sqliteTable("auth_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().default(""),
  name: text("name").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const authIdentities = sqliteTable(
  "auth_identities",
  {
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    userId: text("user_id").notNull(),
    providerEmail: text("provider_email").notNull().default(""),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerUserId] }),
    index("auth_identities_user_idx").on(table.userId),
  ],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("auth_sessions_user_idx").on(table.userId),
    index("auth_sessions_expiry_idx").on(table.expiresAt),
  ],
);

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

export const boards = sqliteTable(
  "boards",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    title: text("title").notNull(),
    backgroundType: text("background_type", { enum: ["plain", "dots", "grid", "ruled"] }).notNull().default("plain"),
    backgroundColor: text("background_color").notNull().default("#f8f5ed"),
    latestSequence: integer("latest_sequence").notNull().default(0),
    storageBytes: integer("storage_bytes").notNull().default(0),
    objectCount: integer("object_count").notNull().default(0),
    strokeCount: integer("stroke_count").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("boards_owner_updated_idx").on(table.ownerUserId, table.updatedAt),
  ],
);

export const boardShareLinks = sqliteTable(
  "board_share_links",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    permission: text("permission", { enum: ["view", "edit"] }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (table) => [
    uniqueIndex("board_share_links_token_unique").on(table.tokenHash),
    index("board_share_links_board_active_idx").on(table.boardId, table.revokedAt),
  ],
);

export const boardObjects = sqliteTable(
  "board_objects",
  {
    boardId: text("board_id").notNull(),
    objectId: text("object_id").notNull(),
    kind: text("kind", {
      enum: ["stroke", "text", "line", "arrow", "rectangle", "ellipse", "image", "code"],
    }).notNull(),
    version: integer("version").notNull().default(1),
    zIndex: integer("z_index").notNull().default(0),
    minX: integer("min_x").notNull(),
    minY: integer("min_y").notNull(),
    maxX: integer("max_x").notNull(),
    maxY: integer("max_y").notNull(),
    payloadJson: text("payload_json").notNull(),
    strokeData: blob("stroke_data", { mode: "buffer" }),
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    primaryKey({ columns: [table.boardId, table.objectId] }),
    index("board_objects_board_z_idx").on(table.boardId, table.zIndex),
    index("board_objects_board_bounds_idx").on(table.boardId, table.minX, table.maxX, table.minY, table.maxY),
  ],
);

export const boardOperations = sqliteTable(
  "board_operations",
  {
    boardId: text("board_id").notNull(),
    sequence: integer("sequence").notNull(),
    operationId: text("operation_id").notNull(),
    actorId: text("actor_id").notNull(),
    actorKind: text("actor_kind", { enum: ["user", "guest", "system"] }).notNull(),
    operationType: text("operation_type").notNull(),
    targetObjectId: text("target_object_id"),
    payload: blob("payload", { mode: "buffer" }).notNull(),
    inversePayload: blob("inverse_payload", { mode: "buffer" }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.boardId, table.sequence] }),
    uniqueIndex("board_operations_board_operation_unique").on(table.boardId, table.operationId),
    index("board_operations_board_created_idx").on(table.boardId, table.createdAt),
  ],
);

export const boardSnapshots = sqliteTable(
  "board_snapshots",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id").notNull(),
    sequence: integer("sequence").notNull(),
    payload: blob("payload", { mode: "buffer" }).notNull(),
    objectCount: integer("object_count").notNull().default(0),
    strokeCount: integer("stroke_count").notNull().default(0),
    reason: text("reason", { enum: ["periodic", "before_restore", "manual_restore"] }).notNull(),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    uniqueIndex("board_snapshots_board_sequence_unique").on(table.boardId, table.sequence),
    index("board_snapshots_expiry_idx").on(table.expiresAt),
  ],
);

export const boardAssets = sqliteTable(
  "board_assets",
  {
    boardId: text("board_id").notNull(),
    id: text("id").notNull(),
    storageKey: text("storage_key").notNull(),
    thumbnailKey: text("thumbnail_key").notNull().default(""),
    contentType: text("content_type").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    createdAt: integer("created_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    primaryKey({ columns: [table.boardId, table.id] }),
    index("board_assets_board_created_idx").on(table.boardId, table.createdAt),
    index("board_assets_storage_key_idx").on(table.storageKey),
  ],
);
