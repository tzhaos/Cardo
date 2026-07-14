import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { HistoryChangeSet } from '../contracts/history';
import type { ItemMetadata } from '../contracts/workspace';
import {
  workspaceBoxDetailModes,
  workspaceBoxIcons,
  workspaceBoxKinds,
  workspaceBoxViewModes,
  workspaceItemTypes,
} from '../contracts/workspace';
import {
  colorModes,
  densities,
  fontFamilyIds,
  fontScales,
  preferenceLocales,
  webSearchEngineIds,
} from '../contracts/preferences';
import type { FeatureFlagOverrides } from '../contracts/featureCatalog';
import { layoutProfileIds } from '../contracts/layoutProfile';
import { groupViewModeIds } from '../contracts/groupView';
import type { BoxFrame } from '../contracts/workspace';
import type {
  ImportedThemePacks,
  ThemeColorOverrides,
  ThemeOptionValues,
} from '../contracts/themePack';

export { DATABASE_SCHEMA_VERSION } from './version';
export const APP_STATE_ID = 1;
export const PREFERENCES_ID = 1;
export const RUNTIME_META_ID = 1;

export const appState = sqliteTable('app_state', {
  id: integer('id').primaryKey(),
  schemaVersion: integer('schema_version').notNull(),
  activePageId: text('active_page_id').notNull(),
  defaultPageId: text('default_page_id').notNull(),
});

/** Per-mode frames for waterfall/list — freeform stays in x/y/width/height columns. */
export type BoxModeLayouts = {
  waterfall: BoxFrame;
  list: BoxFrame;
};

export const pages = sqliteTable(
  'pages',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull(),
    groupViewMode: text('group_view_mode', { enum: groupViewModeIds })
      .notNull()
      .default('freeform'),
    /** 0 = auto columns from viewport; otherwise fixed 1…max. */
    waterfallColumns: integer('waterfall_columns').notNull().default(0),
    listColumns: integer('list_columns').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('pages_sort_order_unique').on(table.sortOrder)],
);

export const boxes = sqliteTable(
  'boxes',
  {
    id: text('id').primaryKey(),
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: workspaceBoxKinds }).notNull(),
    title: text('title').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    /** Isolated waterfall/list frames; freeform uses x/y/width/height only. */
    modeLayouts: text('mode_layouts', { mode: 'json' }).$type<BoxModeLayouts>().notNull(),
    viewMode: text('view_mode', { enum: workspaceBoxViewModes }).notNull(),
    detailMode: text('detail_mode', { enum: workspaceBoxDetailModes }).notNull(),
    isLocked: integer('is_locked', { mode: 'boolean' }).notNull(),
    icon: text('icon', { enum: workspaceBoxIcons }).notNull(),
    accent: text('accent').notNull(),
    zIndex: integer('z_index').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('boxes_page_id_index').on(table.pageId),
    index('boxes_page_z_index').on(table.pageId, table.zIndex),
  ],
);

export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: workspaceItemTypes }).notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    metadata: text('metadata', { mode: 'json' }).$type<ItemMetadata>().notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('items_type_index').on(table.type)],
);

export const boxItems = sqliteTable(
  'box_items',
  {
    boxId: text('box_id')
      .notNull()
      .references(() => boxes.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull(),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.boxId, table.itemId] }),
    uniqueIndex('box_items_item_unique').on(table.itemId),
    uniqueIndex('box_items_order_unique').on(table.boxId, table.sortOrder),
  ],
);

export const collectionBoxViews = sqliteTable('collection_box_views', {
  boxId: text('box_id')
    .primaryKey()
    .references(() => boxes.id, { onDelete: 'cascade' }),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  viewMode: text('view_mode', { enum: workspaceBoxViewModes }).notNull(),
  detailMode: text('detail_mode', { enum: workspaceBoxDetailModes }).notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const preferences = sqliteTable('preferences', {
  id: integer('id').primaryKey(),
  locale: text('locale', { enum: preferenceLocales }).notNull(),
  colorMode: text('color_mode', { enum: colorModes }).notNull(),
  themeId: text('theme_id').notNull(),
  fontFamily: text('font_family', { enum: fontFamilyIds }).notNull(),
  fontScale: text('font_scale', { enum: fontScales }).notNull(),
  density: text('density', { enum: densities }).notNull(),
  /** Per-theme color tweaks. Empty object = official pack tokens unchanged. */
  themeColorOverrides: text('theme_color_overrides', { mode: 'json' })
    .$type<ThemeColorOverrides>()
    .notNull(),
  /** Selected Style Settings-style option values. Empty uses pack option defaults. */
  themeOptionValues: text('theme_option_values', { mode: 'json' })
    .$type<ThemeOptionValues>()
    .notNull(),
  /** User-imported Theme Packs (official built-ins stay code-defined and frozen). */
  importedThemePacks: text('imported_theme_packs', { mode: 'json' })
    .$type<ImportedThemePacks>()
    .notNull(),
  /**
   * Feature Catalog overrides. Empty object ⇒ all official Cardo defaults (on).
   * Only stores deviations so classic shell stays unchanged out of the box.
   */
  featureFlags: text('feature_flags', { mode: 'json' }).$type<FeatureFlagOverrides>().notNull(),
  /** Shell layout variant. classic freezes the official product shell. */
  layoutProfileId: text('layout_profile_id', { enum: layoutProfileIds }).notNull(),
  /** User CSS snippet (validated on apply). Empty + disabled = no injection. */
  cssSnippet: text('css_snippet').notNull(),
  cssSnippetEnabled: integer('css_snippet_enabled', { mode: 'boolean' }).notNull(),
  searchEngine: text('search_engine', {
    enum: webSearchEngineIds,
  }).notNull(),
  customSearchTemplate: text('custom_search_template').notNull(),
});

export const operationLog = sqliteTable(
  'operation_log',
  {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id').notNull(),
    commandType: text('command_type').notNull(),
    commandPayload: text('command_payload', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull(),
    source: text('source', { enum: ['user', 'system', 'import', 'undo', 'redo'] }).notNull(),
    undoable: integer('undoable', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('operation_log_transaction_unique').on(table.transactionId),
    index('operation_log_created_at_index').on(table.createdAt),
  ],
);

export const historyEntries = sqliteTable(
  'history_entries',
  {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id')
      .notNull()
      .references(() => operationLog.transactionId, { onDelete: 'cascade' }),
    commandType: text('command_type').notNull(),
    changes: text('changes', { mode: 'json' }).$type<HistoryChangeSet>().notNull(),
    state: text('state', { enum: ['applied', 'undone'] }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('history_entries_transaction_unique').on(table.transactionId),
    index('history_entries_state_created_index').on(table.state, table.createdAt),
  ],
);

/**
 * Multi-client revision counter. Single row id = RUNTIME_META_ID.
 * Never appears in history change sets; undo/redo do not roll this back.
 */
export const runtimeMeta = sqliteTable('runtime_meta', {
  id: integer('id').primaryKey(),
  revision: integer('revision').notNull().default(0),
});

export const pagesRelations = relations(pages, ({ many }) => ({ boxes: many(boxes) }));

export const boxesRelations = relations(boxes, ({ one, many }) => ({
  page: one(pages, { fields: [boxes.pageId], references: [pages.id] }),
  itemPlacements: many(boxItems),
  collectionView: one(collectionBoxViews),
}));

export const itemsRelations = relations(items, ({ one }) => ({ placement: one(boxItems) }));

export const boxItemsRelations = relations(boxItems, ({ one }) => ({
  box: one(boxes, { fields: [boxItems.boxId], references: [boxes.id] }),
  item: one(items, { fields: [boxItems.itemId], references: [items.id] }),
}));

export const collectionBoxViewsRelations = relations(collectionBoxViews, ({ one }) => ({
  box: one(boxes, { fields: [collectionBoxViews.boxId], references: [boxes.id] }),
}));

export const pageSelectSchema = createSelectSchema(pages);
export const pageInsertSchema = createInsertSchema(pages);
export const boxSelectSchema = createSelectSchema(boxes);
export const boxInsertSchema = createInsertSchema(boxes);
export const itemSelectSchema = createSelectSchema(items);
export const itemInsertSchema = createInsertSchema(items);
export const boxItemSelectSchema = createSelectSchema(boxItems);
export const boxItemInsertSchema = createInsertSchema(boxItems);
export const preferencesSelectSchema = createSelectSchema(preferences);
export const preferencesInsertSchema = createInsertSchema(preferences);
export const appStateSelectSchema = createSelectSchema(appState);
export const boxSelectSchemaStrict = createSelectSchema(boxes);
export const collectionBoxViewSelectSchema = createSelectSchema(collectionBoxViews);
export const runtimeMetaSelectSchema = createSelectSchema(runtimeMeta);
export const runtimeMetaInsertSchema = createInsertSchema(runtimeMeta);

export const databaseSchema = {
  appState,
  pages,
  boxes,
  items,
  boxItems,
  collectionBoxViews,
  preferences,
  operationLog,
  historyEntries,
  runtimeMeta,
  pagesRelations,
  boxesRelations,
  itemsRelations,
  boxItemsRelations,
  collectionBoxViewsRelations,
};

export type DatabaseSchema = typeof databaseSchema;
