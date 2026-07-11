-- Rename system page primary keys (boxes.page_id + app_state references follow).
-- sort_order is UNIQUE: shift old rows temporarily, insert new ids, re-point FKs, delete old.

UPDATE `pages` SET `sort_order` = `sort_order` - 1000000 WHERE `id` = 'khaosbox-collection';
--> statement-breakpoint
INSERT INTO `pages` (`id`, `title`, `sort_order`, `created_at`, `updated_at`)
SELECT 'cardo-collection', `title`, `sort_order` + 1000000, `created_at`, `updated_at`
FROM `pages` WHERE `id` = 'khaosbox-collection';
--> statement-breakpoint
UPDATE `boxes` SET `page_id` = 'cardo-collection' WHERE `page_id` = 'khaosbox-collection';
--> statement-breakpoint
UPDATE `app_state` SET `active_page_id` = 'cardo-collection' WHERE `active_page_id` = 'khaosbox-collection';
--> statement-breakpoint
UPDATE `app_state` SET `default_page_id` = 'cardo-collection' WHERE `default_page_id` = 'khaosbox-collection';
--> statement-breakpoint
DELETE FROM `pages` WHERE `id` = 'khaosbox-collection';
--> statement-breakpoint
UPDATE `pages` SET `sort_order` = `sort_order` - 1000000 WHERE `id` = 'khaosbox-recycle-bin';
--> statement-breakpoint
INSERT INTO `pages` (`id`, `title`, `sort_order`, `created_at`, `updated_at`)
SELECT 'cardo-recycle-bin', `title`, `sort_order` + 1000000, `created_at`, `updated_at`
FROM `pages` WHERE `id` = 'khaosbox-recycle-bin';
--> statement-breakpoint
UPDATE `boxes` SET `page_id` = 'cardo-recycle-bin' WHERE `page_id` = 'khaosbox-recycle-bin';
--> statement-breakpoint
UPDATE `app_state` SET `active_page_id` = 'cardo-recycle-bin' WHERE `active_page_id` = 'khaosbox-recycle-bin';
--> statement-breakpoint
UPDATE `app_state` SET `default_page_id` = 'cardo-recycle-bin' WHERE `default_page_id` = 'khaosbox-recycle-bin';
--> statement-breakpoint
DELETE FROM `pages` WHERE `id` = 'khaosbox-recycle-bin';
--> statement-breakpoint
UPDATE `app_state` SET `schema_version` = 5 WHERE `id` = 1;
