ALTER TABLE `pages` ADD `group_view_mode` text DEFAULT 'freeform' NOT NULL;--> statement-breakpoint
ALTER TABLE `pages` ADD `waterfall_columns` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `pages` ADD `list_columns` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `boxes` ADD `mode_layouts` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
UPDATE `boxes` SET `mode_layouts` = json_object(
  'waterfall', json_object('x', `x`, 'y', `y`, 'width', `width`, 'height', `height`),
  'list', json_object('x', `x`, 'y', `y`, 'width', `width`, 'height', `height`)
);
