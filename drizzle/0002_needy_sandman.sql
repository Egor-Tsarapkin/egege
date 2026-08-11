CREATE TABLE `teacher_folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`parent_id` integer,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `teacher_folders_owner_kind_parent_idx` ON `teacher_folders` (`owner_id`,`kind`,`parent_id`);--> statement-breakpoint
CREATE TABLE `teacher_task_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`owner_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`name` text NOT NULL,
	`content_type` text DEFAULT 'application/octet-stream' NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_task_files_storage_key_unique` ON `teacher_task_files` (`storage_key`);--> statement-breakpoint
CREATE INDEX `teacher_task_files_task_idx` ON `teacher_task_files` (`task_id`);--> statement-breakpoint
CREATE TABLE `teacher_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`folder_id` integer,
	`exam_number` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`statement_html` text NOT NULL,
	`answer_type` text DEFAULT 'field' NOT NULL,
	`answer_json` text NOT NULL,
	`solution_video_url` text DEFAULT '' NOT NULL,
	`solution_timecode` integer DEFAULT 0 NOT NULL,
	`solution_html` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_tasks_public_id_unique` ON `teacher_tasks` (`public_id`);--> statement-breakpoint
CREATE INDEX `teacher_tasks_owner_folder_idx` ON `teacher_tasks` (`owner_id`,`folder_id`);--> statement-breakpoint
CREATE INDEX `teacher_tasks_exam_number_idx` ON `teacher_tasks` (`exam_number`,`created_at`);--> statement-breakpoint
CREATE TABLE `teacher_variant_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`student_name` text NOT NULL,
	`score` integer NOT NULL,
	`correct_count` integer NOT NULL,
	`answered_count` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`completed_at` text NOT NULL,
	`results_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `teacher_variant_attempts_variant_created_idx` ON `teacher_variant_attempts` (`variant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `teacher_variant_attempts_variant_user_idx` ON `teacher_variant_attempts` (`variant_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `teacher_variant_tasks` (
	`variant_id` integer NOT NULL,
	`position` integer NOT NULL,
	`task_public_id` text NOT NULL,
	PRIMARY KEY(`variant_id`, `position`)
);
--> statement-breakpoint
CREATE INDEX `teacher_variant_tasks_task_idx` ON `teacher_variant_tasks` (`task_public_id`);--> statement-breakpoint
CREATE TABLE `teacher_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kim` text NOT NULL,
	`owner_id` text NOT NULL,
	`folder_id` integer,
	`title` text NOT NULL,
	`description_html` text DEFAULT '' NOT NULL,
	`no_time` integer DEFAULT false NOT NULL,
	`hide_answers` integer DEFAULT false NOT NULL,
	`require_auth` integer DEFAULT false NOT NULL,
	`one_attempt` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_variants_kim_unique` ON `teacher_variants` (`kim`);--> statement-breakpoint
CREATE INDEX `teacher_variants_owner_folder_idx` ON `teacher_variants` (`owner_id`,`folder_id`);