import { z } from 'zod';

/** How Desktop resolves an HTTP(S) proxy for GitHub update API + installer download. */
export const updateProxyModeSchema = z.enum(['auto', 'manual', 'off']);
export type UpdateProxyMode = z.infer<typeof updateProxyModeSchema>;

export const updateProxySettingsSchema = z
  .object({
    mode: updateProxyModeSchema,
    /** Used when mode is manual (and as preferred host when probing auto). */
    host: z.string().trim().min(1).max(253),
    /** Used when mode is manual; also first port tried in auto after env. */
    port: z.number().int().min(1).max(65535),
  })
  .strict();

export type UpdateProxySettings = z.infer<typeof updateProxySettingsSchema>;

export const DEFAULT_UPDATE_PROXY_SETTINGS: UpdateProxySettings = {
  mode: 'auto',
  host: '127.0.0.1',
  port: 7890,
};

export const updateProxySettingsInputSchema = z
  .object({
    mode: updateProxyModeSchema,
    host: z.string().trim().min(1).max(253).optional(),
    port: z.number().int().min(1).max(65535).optional(),
  })
  .strict()
  .transform((value) => ({
    mode: value.mode,
    host: value.host?.trim() || DEFAULT_UPDATE_PROXY_SETTINGS.host,
    port: value.port ?? DEFAULT_UPDATE_PROXY_SETTINGS.port,
  }));
