CREATE TABLE `runtime_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `runtime_meta` (`id`, `revision`) VALUES (1, 0);
