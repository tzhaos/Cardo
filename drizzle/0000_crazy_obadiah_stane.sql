CREATE TABLE `app_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`schema_version` integer NOT NULL,
	`active_page_id` text NOT NULL,
	`default_page_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `box_items` (
	`box_id` text NOT NULL,
	`item_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`is_pinned` integer NOT NULL,
	PRIMARY KEY(`box_id`, `item_id`),
	FOREIGN KEY (`box_id`) REFERENCES `boxes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `box_items_item_unique` ON `box_items` (`item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `box_items_order_unique` ON `box_items` (`box_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `boxes` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`preset` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`view_mode` text NOT NULL,
	`detail_mode` text NOT NULL,
	`is_locked` integer NOT NULL,
	`icon` text NOT NULL,
	`accent` text NOT NULL,
	`z_index` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `boxes_page_id_index` ON `boxes` (`page_id`);--> statement-breakpoint
CREATE INDEX `boxes_page_z_index` ON `boxes` (`page_id`,`z_index`);--> statement-breakpoint
CREATE TABLE `collection_box_views` (
	`box_id` text PRIMARY KEY NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`view_mode` text NOT NULL,
	`detail_mode` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`box_id`) REFERENCES `boxes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `history_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`command_type` text NOT NULL,
	`changes` text NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `operation_log`(`transaction_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_entries_transaction_unique` ON `history_entries` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `history_entries_state_created_index` ON `history_entries` (`state`,`created_at`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`metadata` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `items_type_index` ON `items` (`type`);--> statement-breakpoint
CREATE TABLE `operation_log` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`command_type` text NOT NULL,
	`command_payload` text NOT NULL,
	`source` text NOT NULL,
	`undoable` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operation_log_transaction_unique` ON `operation_log` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `operation_log_created_at_index` ON `operation_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_sort_order_unique` ON `pages` (`sort_order`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` integer PRIMARY KEY NOT NULL,
	`locale` text NOT NULL,
	`color_mode` text NOT NULL,
	`theme_id` text NOT NULL,
	`search_engine` text NOT NULL,
	`custom_search_template` text NOT NULL
);
