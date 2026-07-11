import { z } from 'zod';

export const workspaceItemTypes = [
  'file',
  'shortcut',
  'folder',
  'bookmark',
  'clipboard',
] as const;
export const workspaceBoxPresets = ['general', 'folder', 'bookmark', 'clipboard'] as const;
export const workspaceBoxViewModes = ['list', 'grid'] as const;
export const workspaceBoxDetailModes = ['detailed', 'compact'] as const;
export const workspaceBoxKinds = ['normal', 'temporary'] as const;
export const workspaceBoxIcons = [
  'box',
  'folder',
  'bookmark',
  'clipboard',
  'briefcase',
  'code',
  'image',
  'music',
  'book',
  'idea',
  'star',
  'heart',
] as const;

export const workspaceItemTypeSchema = z.enum(workspaceItemTypes);
export const workspaceBoxPresetSchema = z.enum(workspaceBoxPresets);
export const workspaceBoxViewModeSchema = z.enum(workspaceBoxViewModes);
export const workspaceBoxDetailModeSchema = z.enum(workspaceBoxDetailModes);
export const workspaceBoxKindSchema = z.enum(workspaceBoxKinds);
export const workspaceBoxIconSchema = z.enum(workspaceBoxIcons);

export const entityIdSchema = z.string().trim().min(1).max(128);
export const isoDateTimeSchema = z.iso.datetime({ offset: true });
export const colorHexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const boxFrameSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().min(240),
    height: z.number().finite().min(170),
  })
  .strict();

const itemBaseSchema = z.object({
  id: entityIdSchema,
  title: z.string().max(512),
  isPinned: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const workspaceItemSchema = z.discriminatedUnion('type', [
  itemBaseSchema.extend({ type: z.literal('file'), path: z.string().trim().min(1) }).strict(),
  itemBaseSchema.extend({ type: z.literal('folder'), path: z.string().trim().min(1) }).strict(),
  itemBaseSchema
    .extend({
      type: z.literal('shortcut'),
      path: z.string().trim().min(1),
      targetType: z.enum(['file', 'folder', 'application']).optional(),
    })
    .strict(),
  itemBaseSchema
    .extend({
      type: z.literal('bookmark'),
      url: z.url(),
      favicon: z.string().trim().min(1).optional(),
    })
    .strict(),
  itemBaseSchema.extend({ type: z.literal('clipboard'), text: z.string().min(1) }).strict(),
]);

export const itemMetadataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('file') }).strict(),
  z.object({ type: z.literal('folder') }).strict(),
  z
    .object({
      type: z.literal('shortcut'),
      targetType: z.enum(['file', 'folder', 'application']).optional(),
    })
    .strict(),
  z.object({ type: z.literal('bookmark'), favicon: z.string().trim().min(1).optional() }).strict(),
  z.object({ type: z.literal('clipboard') }).strict(),
]);

export const historyRowChangeSchema = z
  .object({
    table: z.enum([
      'app_state',
      'pages',
      'boxes',
      'items',
      'box_items',
      'collection_box_views',
      'preferences',
    ]),
    key: z.record(z.string(), z.union([z.string(), z.number()])),
    before: z.record(z.string(), z.unknown()).nullable(),
    after: z.record(z.string(), z.unknown()).nullable(),
  })
  .strict();

export const historyChangeSetSchema = z.array(historyRowChangeSchema).min(1);

export type WorkspaceItem = z.infer<typeof workspaceItemSchema>;
export type WorkspaceItemType = z.infer<typeof workspaceItemTypeSchema>;
export type WorkspaceBoxPreset = z.infer<typeof workspaceBoxPresetSchema>;
export type WorkspaceBoxViewMode = z.infer<typeof workspaceBoxViewModeSchema>;
export type WorkspaceBoxDetailMode = z.infer<typeof workspaceBoxDetailModeSchema>;
export type WorkspaceBoxKind = z.infer<typeof workspaceBoxKindSchema>;
export type WorkspaceBoxIcon = z.infer<typeof workspaceBoxIconSchema>;
export type BoxFrame = z.infer<typeof boxFrameSchema>;
export type ItemMetadata = z.infer<typeof itemMetadataSchema>;
export type HistoryChangeSet = z.infer<typeof historyChangeSetSchema>;
