ALTER TABLE `preferences` ADD `theme_color_overrides` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `preferences` ADD `theme_option_values` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `preferences` ADD `imported_theme_packs` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
UPDATE `app_state` SET `schema_version` = 7 WHERE `id` = 1;
