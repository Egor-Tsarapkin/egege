CREATE TABLE `friendships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pair_key` text NOT NULL,
	`requester_id` text NOT NULL,
	`addressee_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friendships_pair_unique` ON `friendships` (`pair_key`);--> statement-breakpoint
CREATE INDEX `friendships_requester_idx` ON `friendships` (`requester_id`,`status`);--> statement-breakpoint
CREATE INDEX `friendships_addressee_idx` ON `friendships` (`addressee_id`,`status`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_emoji` text DEFAULT '🙂' NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`suspicion_score` integer DEFAULT 0 NOT NULL,
	`rate_limited_until` integer DEFAULT 0 NOT NULL,
	`last_award_at` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE INDEX `profiles_xp_idx` ON `profiles` (`xp`);--> statement-breakpoint
CREATE TABLE `score_events` (
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	`reason` text NOT NULL,
	`date_key` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `task_id`)
);
--> statement-breakpoint
CREATE INDEX `score_events_user_created_idx` ON `score_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `score_events_user_date_idx` ON `score_events` (`user_id`,`date_key`);