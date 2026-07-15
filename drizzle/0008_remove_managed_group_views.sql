-- Remove waterfall/list group views: only freeform remains.
ALTER TABLE `pages` DROP COLUMN `group_view_mode`;--> statement-breakpoint
ALTER TABLE `pages` DROP COLUMN `waterfall_columns`;--> statement-breakpoint
ALTER TABLE `pages` DROP COLUMN `list_columns`;--> statement-breakpoint
ALTER TABLE `boxes` DROP COLUMN `mode_layouts`;
