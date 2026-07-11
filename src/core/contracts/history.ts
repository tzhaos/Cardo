import { z } from 'zod';
import {
  appStateSelectSchema,
  boxItemSelectSchema,
  boxSelectSchemaStrict,
  collectionBoxViewSelectSchema,
  itemSelectSchema,
  pageSelectSchema,
  preferencesSelectSchema,
} from '../database/schema';

const appStateHistoryKeySchema = z.object({ id: z.number().int() }).strict();
const pageHistoryKeySchema = z.object({ id: z.string().trim().min(1) }).strict();
const boxHistoryKeySchema = z.object({ id: z.string().trim().min(1) }).strict();
const itemHistoryKeySchema = z.object({ id: z.string().trim().min(1) }).strict();
const boxItemHistoryKeySchema = z
  .object({
    boxId: z.string().trim().min(1),
    itemId: z.string().trim().min(1),
  })
  .strict();
const collectionBoxViewHistoryKeySchema = z.object({ boxId: z.string().trim().min(1) }).strict();
const preferencesHistoryKeySchema = z.object({ id: z.number().int() }).strict();

function historyRowChangeSchemaFor<
  const Table extends string,
  KeySchema extends z.ZodTypeAny,
  RowSchema extends z.ZodTypeAny,
>(table: Table, keySchema: KeySchema, rowSchema: RowSchema) {
  return z
    .object({
      table: z.literal(table),
      key: keySchema,
      before: rowSchema.nullable(),
      after: rowSchema.nullable(),
    })
    .strict();
}

export const historyRowChangeSchema = z.discriminatedUnion('table', [
  historyRowChangeSchemaFor('app_state', appStateHistoryKeySchema, appStateSelectSchema),
  historyRowChangeSchemaFor('pages', pageHistoryKeySchema, pageSelectSchema),
  historyRowChangeSchemaFor('boxes', boxHistoryKeySchema, boxSelectSchemaStrict),
  historyRowChangeSchemaFor('items', itemHistoryKeySchema, itemSelectSchema),
  historyRowChangeSchemaFor('box_items', boxItemHistoryKeySchema, boxItemSelectSchema),
  historyRowChangeSchemaFor(
    'collection_box_views',
    collectionBoxViewHistoryKeySchema,
    collectionBoxViewSelectSchema,
  ),
  historyRowChangeSchemaFor('preferences', preferencesHistoryKeySchema, preferencesSelectSchema),
]);

export const historyChangeSetSchema = z.array(historyRowChangeSchema).min(1);

export type HistoryRowChange = z.infer<typeof historyRowChangeSchema>;
export type HistoryChangeSet = HistoryRowChange[];
export type HistoryTable = HistoryRowChange['table'];
