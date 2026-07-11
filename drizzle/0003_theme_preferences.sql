ALTER TABLE `preferences` ADD `font_family` text DEFAULT 'default' NOT NULL;
--> statement-breakpoint
ALTER TABLE `preferences` ADD `font_scale` text DEFAULT 'md' NOT NULL;
--> statement-breakpoint
ALTER TABLE `preferences` ADD `density` text DEFAULT 'comfortable' NOT NULL;
--> statement-breakpoint
UPDATE `app_state` SET `schema_version` = 6 WHERE `id` = 1;
