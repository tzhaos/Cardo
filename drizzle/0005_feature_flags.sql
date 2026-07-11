ALTER TABLE `preferences` ADD `feature_flags` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
UPDATE `app_state` SET `schema_version` = 8 WHERE `id` = 1;
