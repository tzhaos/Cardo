import { z } from 'zod';

export const databaseValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.bigint(),
  z.null(),
  z.instanceof(Uint8Array),
]);

export const databaseExecuteMethodSchema = z.enum(['run', 'all', 'values', 'get']);

export const databaseExecuteRequestSchema = z
  .object({
    sql: z.string().trim().min(1),
    params: z.array(databaseValueSchema),
    method: databaseExecuteMethodSchema,
  })
  .strict();

export const databaseExecuteResponseSchema = z
  .object({
    rows: z.array(z.unknown()),
  })
  .strict();

export type DatabaseValue = z.infer<typeof databaseValueSchema>;
export type DatabaseExecuteRequest = z.infer<typeof databaseExecuteRequestSchema>;
export type DatabaseExecuteResponse = z.infer<typeof databaseExecuteResponseSchema>;
