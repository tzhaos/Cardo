ALTER TABLE `preferences` ADD `layout_profile_id` text DEFAULT 'classic' NOT NULL;
--> statement-breakpoint
ALTER TABLE `preferences` ADD `css_snippet` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `preferences` ADD `css_snippet_enabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `app_state` SET `schema_version` = 9 WHERE `id` = 1;
