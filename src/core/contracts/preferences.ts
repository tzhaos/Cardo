import { z } from 'zod';

export const preferenceLocales = ['en', 'zh'] as const;
export const colorModes = ['light', 'dark'] as const;
export const webSearchEngineIds = ['bing-cn', 'bing', 'baidu', 'google', 'custom'] as const;

/** Built-in font stacks selectable from Settings (Phase A). */
export const fontFamilyIds = ['default', 'system-ui', 'serif'] as const;

/** Relative type scale applied to the document root. */
export const fontScales = ['sm', 'md', 'lg'] as const;

/** UI density scale for spacing tokens. */
export const densities = ['compact', 'comfortable', 'spacious'] as const;

export const preferenceLocaleSchema = z.enum(preferenceLocales);
export const colorModeSchema = z.enum(colorModes);
export const webSearchEngineIdSchema = z.enum(webSearchEngineIds);
export const fontFamilyIdSchema = z.enum(fontFamilyIds);
export const fontScaleSchema = z.enum(fontScales);
export const densitySchema = z.enum(densities);

export type PreferenceLocale = z.infer<typeof preferenceLocaleSchema>;
export type ColorMode = z.infer<typeof colorModeSchema>;
export type WebSearchEngineId = z.infer<typeof webSearchEngineIdSchema>;
export type FontFamilyId = z.infer<typeof fontFamilyIdSchema>;
export type FontScale = z.infer<typeof fontScaleSchema>;
export type Density = z.infer<typeof densitySchema>;

export const FONT_SCALE_FACTORS = {
  sm: 0.92,
  md: 1,
  lg: 1.1,
} as const satisfies Record<FontScale, number>;

export const DENSITY_FACTORS = {
  compact: 0.9,
  comfortable: 1,
  spacious: 1.12,
} as const satisfies Record<Density, number>;

export const FONT_FAMILY_STACKS = {
  default:
    "'Inter Variable', Inter, 'Noto Sans SC', 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'system-ui':
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', sans-serif",
  serif:
    "Georgia, 'Times New Roman', 'Songti SC', 'SimSun', 'Noto Serif SC', ui-serif, serif",
} as const satisfies Record<FontFamilyId, string>;

export const DEFAULT_FONT_FAMILY_ID: FontFamilyId = 'default';
export const DEFAULT_FONT_SCALE: FontScale = 'md';
export const DEFAULT_DENSITY: Density = 'comfortable';
