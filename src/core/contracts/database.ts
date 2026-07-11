import { z } from 'zod';

export const databaseValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.bigint(),
  z.null(),
  z.instanceof(ArrayBuffer),
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
    rows: z.array(z.array(databaseValueSchema)),
  })
  .strict();

export const databaseWorkerRequestSchema = z
  .object({
    id: z.string().uuid(),
    request: databaseExecuteRequestSchema,
  })
  .strict();

export const databaseWorkerResponseSchema = z.discriminatedUnion('ok', [
  z
    .object({
      id: z.string().uuid(),
      ok: z.literal(true),
      response: databaseExecuteResponseSchema,
    })
    .strict(),
  z
    .object({
      id: z.string().uuid(),
      ok: z.literal(false),
      error: z.string().min(1),
    })
    .strict(),
]);

export type DatabaseValue = z.infer<typeof databaseValueSchema>;
export type DatabaseExecuteRequest = z.infer<typeof databaseExecuteRequestSchema>;
export type DatabaseExecuteResponse = z.infer<typeof databaseExecuteResponseSchema>;
export type DatabaseWorkerRequest = z.infer<typeof databaseWorkerRequestSchema>;
export type DatabaseWorkerResponse = z.infer<typeof databaseWorkerResponseSchema>;
