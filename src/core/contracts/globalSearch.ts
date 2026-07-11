import { z } from 'zod';
import { boxFrameSchema, entityIdSchema, isoDateTimeSchema, workspaceItemSchema } from './workspace';

const pageSummarySchema = z
  .object({
    id: entityIdSchema,
    title: z.string(),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

const boxSummarySchema = z
  .object({
    id: entityIdSchema,
    pageId: entityIdSchema,
    title: z.string(),
    frame: boxFrameSchema,
    itemCount: z.number().int().nonnegative(),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

const resultBase = {
  id: z.string(),
  title: z.string(),
  path: z.string(),
  detail: z.string(),
  score: z.number(),
  updatedAt: isoDateTimeSchema,
};

export const globalSearchResultSchema = z.discriminatedUnion('kind', [
  z.object({ ...resultBase, kind: z.literal('page'), page: pageSummarySchema }).strict(),
  z
    .object({
      ...resultBase,
      kind: z.literal('box'),
      page: pageSummarySchema,
      box: boxSummarySchema,
    })
    .strict(),
  z
    .object({
      ...resultBase,
      kind: z.literal('item'),
      page: pageSummarySchema,
      box: boxSummarySchema,
      item: workspaceItemSchema,
    })
    .strict(),
]);

export type GlobalSearchResult = z.infer<typeof globalSearchResultSchema>;
