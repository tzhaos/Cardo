import { z } from 'zod';

export const CARDO_NATIVE_HOST_NAME = 'com.cardo.local_bridge';

export const nativeHostOpenLocalResourceRequestSchema = z
  .object({
    type: z.literal('open-local-resource'),
    resourcePath: z.string().min(1),
  })
  .strict();

/** Thin NM host: read discovery only; never open SQLite (design §6.4.1). */
export const nativeHostRuntimeDiscoverRequestSchema = z
  .object({
    type: z.literal('runtime.discover'),
  })
  .strict();

export const nativeHostRequestSchema = z.discriminatedUnion('type', [
  nativeHostOpenLocalResourceRequestSchema,
  nativeHostRuntimeDiscoverRequestSchema,
]);

export const nativeHostOpenLocalResourceOkSchema = z.object({ ok: z.literal(true) }).strict();

export const nativeHostRuntimeDiscoverOkSchema = z
  .object({
    ok: z.literal(true),
    type: z.literal('runtime.discover.ok'),
    baseUrl: z.string().min(1),
    port: z.number().int().positive(),
    token: z.string().min(32),
    pid: z.number().int().positive(),
    startedBy: z.enum(['cli', 'desktop']),
    lifetimeMode: z.enum(['foreground', 'auto']),
    schemaVersion: z.number().int().positive(),
    startedAt: z.string().min(1),
    /** From discovery snapshot at Runtime write time (no SQLite on NM path). */
    revision: z.number().int().nonnegative(),
  })
  .strict();

export const nativeHostErrorResponseSchema = z
  .object({
    ok: z.literal(false),
    errorMessage: z.string(),
    code: z.string().optional(),
  })
  .strict();

export const nativeHostResponseSchema = z.union([
  nativeHostRuntimeDiscoverOkSchema,
  nativeHostOpenLocalResourceOkSchema,
  nativeHostErrorResponseSchema,
]);

export type NativeHostRequest = z.infer<typeof nativeHostRequestSchema>;
export type NativeHostResponse = z.infer<typeof nativeHostResponseSchema>;
