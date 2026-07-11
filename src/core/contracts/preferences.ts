import { z } from 'zod';

export const preferenceLocales = ['en', 'zh'] as const;
export const colorModes = ['light', 'dark'] as const;
export const webSearchEngineIds = ['bing-cn', 'bing', 'baidu', 'google', 'custom'] as const;

export const preferenceLocaleSchema = z.enum(preferenceLocales);
export const colorModeSchema = z.enum(colorModes);
export const webSearchEngineIdSchema = z.enum(webSearchEngineIds);

export type PreferenceLocale = z.infer<typeof preferenceLocaleSchema>;
export type ColorMode = z.infer<typeof colorModeSchema>;
export type WebSearchEngineId = z.infer<typeof webSearchEngineIdSchema>;
