import { z } from 'zod';
import {
  boxFrameSchema,
  colorHexSchema,
  entityIdSchema,
  workspaceBoxDetailModeSchema,
  workspaceBoxIconSchema,
  workspaceBoxPresetSchema,
  workspaceBoxViewModeSchema,
  workspaceItemTypeSchema,
  workspaceProjectionSchema,
} from './workspace';
import { colorModeSchema, preferenceLocaleSchema, webSearchEngineIdSchema } from './preferences';

const titleSchema = z.string().max(512);
const itemDraftSchema = z.record(z.string(), z.string());
const idListSchema = z.array(entityIdSchema);

export const workspaceProjectionContractSchema = workspaceProjectionSchema;

const commandSchemas = [
  z.object({ type: z.literal('workspace.import'), workspace: workspaceProjectionContractSchema }).strict(),
  z.object({ type: z.literal('page.create'), title: titleSchema }).strict(),
  z.object({ type: z.literal('page.rename'), pageId: entityIdSchema, title: titleSchema }).strict(),
  z.object({ type: z.literal('page.delete'), pageId: entityIdSchema }).strict(),
  z.object({ type: z.literal('page.reorder'), orderedPageIds: idListSchema }).strict(),
  z.object({ type: z.literal('page.setDefault'), pageId: entityIdSchema }).strict(),
  z.object({ type: z.literal('page.open'), pageId: entityIdSchema }).strict(),
  z.object({ type: z.literal('preferences.setLocale'), locale: preferenceLocaleSchema }).strict(),
  z
    .object({ type: z.literal('preferences.setColorMode'), colorMode: colorModeSchema })
    .strict(),
  z.object({ type: z.literal('preferences.setTheme'), themeId: entityIdSchema }).strict(),
  z
    .object({
      type: z.literal('preferences.setSearchEngine'),
      searchEngine: webSearchEngineIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('preferences.setCustomSearchTemplate'),
      customSearchTemplate: z.string().max(2048),
    })
    .strict(),
  z
    .object({
      type: z.literal('box.create'),
      pageId: entityIdSchema,
      preset: workspaceBoxPresetSchema,
      frame: boxFrameSchema,
      title: titleSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('item.paste'),
      pageId: entityIdSchema,
      targetBoxId: entityIdSchema.nullable(),
      temporaryFrame: boxFrameSchema,
      itemType: workspaceItemTypeSchema,
      draft: itemDraftSchema,
    })
    .strict(),
  z.object({ type: z.literal('box.updateFrame'), boxId: entityIdSchema, frame: boxFrameSchema }).strict(),
  z
    .object({
      type: z.literal('collection.updateBoxFrame'),
      boxId: entityIdSchema,
      frame: boxFrameSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('collection.updateView'),
      boxId: entityIdSchema,
      patch: z
        .object({
          viewMode: workspaceBoxViewModeSchema.optional(),
          detailMode: workspaceBoxDetailModeSchema.optional(),
          order: z.number().int().nonnegative().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal('canvas.arrange'),
      pageId: entityIdSchema,
      frames: z.record(entityIdSchema, boxFrameSchema),
    })
    .strict(),
  z
    .object({
      type: z.literal('collection.arrange'),
      frames: z.record(entityIdSchema, boxFrameSchema),
    })
    .strict(),
  z.object({ type: z.literal('box.rename'), boxId: entityIdSchema, title: titleSchema }).strict(),
  z.object({ type: z.literal('box.promote'), boxId: entityIdSchema, title: titleSchema }).strict(),
  z
    .object({
      type: z.literal('box.setDetailMode'),
      boxId: entityIdSchema,
      detailMode: workspaceBoxDetailModeSchema,
    })
    .strict(),
  z.object({ type: z.literal('box.setLocked'), boxId: entityIdSchema, isLocked: z.boolean() }).strict(),
  z
    .object({
      type: z.literal('box.setAppearance'),
      boxId: entityIdSchema,
      icon: workspaceBoxIconSchema.optional(),
      accent: colorHexSchema.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('box.setPreset'),
      boxId: entityIdSchema,
      preset: workspaceBoxPresetSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('box.setViewMode'),
      boxId: entityIdSchema,
      viewMode: workspaceBoxViewModeSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('box.moveToPage'),
      boxId: entityIdSchema,
      pageId: entityIdSchema,
      frame: boxFrameSchema.optional(),
    })
    .strict(),
  z.object({ type: z.literal('box.collect'), boxId: entityIdSchema }).strict(),
  z.object({ type: z.literal('box.removeFromCollection'), boxId: entityIdSchema }).strict(),
  z
    .object({
      type: z.literal('item.moveBetweenBoxes'),
      sourceBoxId: entityIdSchema,
      targetBoxId: entityIdSchema,
      itemId: entityIdSchema,
      targetIndex: z.number().int().nonnegative().optional(),
    })
    .strict(),
  z.object({ type: z.literal('box.delete'), boxId: entityIdSchema }).strict(),
  z
    .object({
      type: z.literal('item.create'),
      boxId: entityIdSchema,
      itemType: workspaceItemTypeSchema,
      draft: itemDraftSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('item.rename'),
      boxId: entityIdSchema,
      itemId: entityIdSchema,
      title: titleSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('item.editContent'),
      boxId: entityIdSchema,
      itemId: entityIdSchema,
      content: z.string(),
    })
    .strict(),
  z
    .object({
      type: z.literal('item.setPinned'),
      boxId: entityIdSchema,
      itemId: entityIdSchema,
      isPinned: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal('item.reorder'),
      boxId: entityIdSchema,
      orderedItemIds: idListSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('item.delete'),
      boxId: entityIdSchema,
      itemId: entityIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('bookmark.setFavicon'),
      boxId: entityIdSchema,
      itemId: entityIdSchema,
      favicon: z.string().trim().min(1),
    })
    .strict(),
  z
    .object({
      type: z.literal('system.constrainFrames'),
      viewport: z
        .object({
          width: z.number().finite().positive(),
          height: z.number().finite().positive(),
        })
        .strict(),
    })
    .strict(),
] as const;

export const workspaceCommandSchema = z.discriminatedUnion('type', commandSchemas);

export type WorkspaceCommand = z.infer<typeof workspaceCommandSchema>;
export type WorkspaceCommandType = WorkspaceCommand['type'];

export interface WorkspaceCommandDefinition {
  type: WorkspaceCommandType;
  title: string;
  undoable: boolean;
  category:
    | 'workspace'
    | 'page'
    | 'box'
    | 'item'
    | 'bookmark'
    | 'preferences'
    | 'collection'
    | 'canvas'
    | 'system';
}

const nonUndoableCommandTypes = new Set<WorkspaceCommandType>([
  'bookmark.setFavicon',
  'page.open',
  'preferences.setLocale',
  'preferences.setColorMode',
  'preferences.setTheme',
  'preferences.setSearchEngine',
  'preferences.setCustomSearchTemplate',
  'system.constrainFrames',
]);

export const workspaceCommandRegistry = Object.freeze(
  Object.fromEntries(
    workspaceCommandSchema.options.map((schema) => {
      const type = schema.shape.type.value;
      const category = type.split('.')[0] as WorkspaceCommandDefinition['category'];
      return [
        type,
        {
          type,
          title: type,
          undoable: !nonUndoableCommandTypes.has(type),
          category,
        } satisfies WorkspaceCommandDefinition,
      ];
    }),
  ) as Record<WorkspaceCommandType, WorkspaceCommandDefinition>,
);

export function parseWorkspaceCommand(input: unknown): WorkspaceCommand {
  return workspaceCommandSchema.parse(input);
}

export function getWorkspaceCommandDefinition(type: WorkspaceCommandType) {
  return workspaceCommandRegistry[type];
}
