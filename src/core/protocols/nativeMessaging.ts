import { z } from 'zod';

export const KHAOSBOX_NATIVE_HOST_NAME = 'com.khaosbox.local_bridge';

export const nativeHostRequestSchema = z
  .object({
    type: z.literal('open-local-resource'),
    resourcePath: z.string().min(1),
  })
  .strict();

export const nativeHostResponseSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }).strict(),
  z.object({ ok: z.literal(false), errorMessage: z.string() }).strict(),
]);

export type NativeHostRequest = z.infer<typeof nativeHostRequestSchema>;
export type NativeHostResponse = z.infer<typeof nativeHostResponseSchema>;
