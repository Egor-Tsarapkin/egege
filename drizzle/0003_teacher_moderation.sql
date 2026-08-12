ALTER TABLE `teacher_tasks` ADD `difficulty` text DEFAULT 'Средний' NOT NULL;
--> statement-breakpoint
ALTER TABLE `teacher_tasks` ADD `approved` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `teacher_variants` ADD `approved` integer DEFAULT false NOT NULL;
