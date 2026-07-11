import { z } from 'zod';

export const desktopVoidResponseSchema = z.undefined();
export const desktopBooleanResponseSchema = z.boolean();
export const desktopTextResponseSchema = z.string();

export const desktopClipboardWriteRequestSchema = z.object({ text: z.string() }).strict();
export const desktopUrlRequestSchema = z.object({ url: z.url() }).strict();
export const desktopLocalResourceRequestSchema = z
  .object({ resourcePath: z.string().trim().min(1) })
  .strict();
export const desktopSaveFileRequestSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    payload: z.string(),
  })
  .strict();

export const desktopLocalResourceResponseSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true) }).strict(),
  z.object({ ok: z.literal(false), error: z.string() }).strict(),
]);
export const desktopWebsiteIconResponseSchema = z.string().startsWith('data:image/').nullable();

/** Injected into renderer as window.__CARDO_RUNTIME__ (design §6.5 / PR4). Never put token in URL. */
export const desktopRuntimeConfigSchema = z
  .object({
    baseUrl: z.string().min(1),
    token: z.string().min(32),
    client: z.literal('desktop'),
  })
  .strict();

export type DesktopLocalResourceResponse = z.infer<typeof desktopLocalResourceResponseSchema>;
export type DesktopRuntimeConfig = z.infer<typeof desktopRuntimeConfigSchema>;
