import { z } from 'zod';
import {
  entityIdSchema,
  workspaceBoxSchema,
  workspaceItemSchema,
  workspacePageSchema,
} from './workspace';

export const workspaceStateQuerySchema = z
  .object({
    activePageId: entityIdSchema,
    defaultPageId: entityIdSchema,
  })
  .strict();

export const pageTabsQuerySchema = z.array(workspacePageSchema);
export const pageBoxesQuerySchema = z.array(workspaceBoxSchema);
export const boxItemsQuerySchema = z.array(workspaceItemSchema);

export type WorkspaceStateQuery = z.infer<typeof workspaceStateQuerySchema>;
export type PageTabsQuery = z.infer<typeof pageTabsQuerySchema>;
export type PageBoxesQuery = z.infer<typeof pageBoxesQuerySchema>;
export type BoxItemsQuery = z.infer<typeof boxItemsQuerySchema>;
