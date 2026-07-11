import { z } from 'zod';
import { MAX_CSS_SNIPPET_CHARS, validateCssSnippet } from './cssSnippet';
import {
  layoutProfileIds,
  layoutProfileIdSchema,
  type LayoutProfileId,
} from './layoutProfile';
import { colorModeSchema } from './preferences';

export { layoutProfileIds, layoutProfileIdSchema, type LayoutProfileId };

/** Localized display strings used by Theme Pack and Settings. */
export const themeLocaleTextSchema = z
  .object({
    en: z.string().min(1).max(128),
    zh: z.string().min(1).max(128),
  })
  .strict();

export type ThemeLocaleText = z.infer<typeof themeLocaleTextSchema>;

/**
 * Semantic color tokens applied per color mode.
 * Values are CSS color strings (hex, rgb, rgba, color-mix, etc.).
 */
export const colorTokenMapSchema = z
  .object({
    canvas: z.string().min(1),
    surface: z.string().min(1),
    surfaceStrong: z.string().min(1),
    panel: z.string().min(1),
    panelBottom: z.string().min(1),
    panelContent: z.string().min(1),
    panelChrome: z.string().min(1),
    border: z.string().min(1),
    borderSubtle: z.string().min(1),
    divider: z.string().min(1),
    text: z.string().min(1),
    softText: z.string().min(1),
    secondaryText: z.string().min(1),
    muted: z.string().min(1),
    hover: z.string().min(1),
    active: z.string().min(1),
    input: z.string().min(1),
    itemHover: z.string().min(1),
    glyph: z.string().min(1),
    neutralButton: z.string().min(1),
    neutralButtonHover: z.string().min(1),
    createBackground: z.string().min(1),
    createText: z.string().min(1),
    scrollbar: z.string().min(1),
    scrollbarHover: z.string().min(1),
    selectionRing: z.string().min(1),
    blue: z.string().min(1).optional(),
    orange: z.string().min(1).optional(),
    purple: z.string().min(1).optional(),
    emerald: z.string().min(1).optional(),
    red: z.string().min(1).optional(),
  })
  .strict();

export type ColorTokenMap = z.infer<typeof colorTokenMapSchema>;

/** Keys users may override from Settings (L1 color tweaks). */
export const overridableColorKeys = [
  'canvas',
  'panel',
  'surface',
  'text',
  'blue',
  'createBackground',
] as const;

export type OverridableColorKey = (typeof overridableColorKeys)[number];

export const overridableColorMapSchema = z
  .object({
    canvas: z.string().min(1).optional(),
    panel: z.string().min(1).optional(),
    surface: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    blue: z.string().min(1).optional(),
    createBackground: z.string().min(1).optional(),
  })
  .strict();

export type OverridableColorMap = z.infer<typeof overridableColorMapSchema>;

/**
 * Per-theme, per-mode color overrides.
 * Shape: { [themeId]: { light?: {...}, dark?: {...} } }
 */
export const themeColorOverridesSchema = z.record(
  z.string().min(1),
  z.partialRecord(colorModeSchema, overridableColorMapSchema),
);

export type ThemeColorOverrides = z.infer<typeof themeColorOverridesSchema>;

export const fontTokenMapSchema = z
  .object({
    sans: z.string().min(1),
    mono: z.string().min(1).optional(),
    sizeBase: z.string().min(1).optional(),
    lineHeightBase: z.string().min(1).optional(),
  })
  .strict();

export type FontTokenMap = z.infer<typeof fontTokenMapSchema>;

export const radiusTokenMapSchema = z
  .object({
    xs: z.string().min(1),
    sm: z.string().min(1),
    md: z.string().min(1),
    lg: z.string().min(1),
    xl: z.string().min(1),
    pill: z.string().min(1),
  })
  .strict();

export type RadiusTokenMap = z.infer<typeof radiusTokenMapSchema>;

export const spaceTokenMapSchema = z
  .object({
    1: z.string().min(1),
    2: z.string().min(1),
    3: z.string().min(1),
    4: z.string().min(1),
    5: z.string().min(1),
    6: z.string().min(1),
    7: z.string().min(1),
    8: z.string().min(1),
  })
  .strict();

export type SpaceTokenMap = z.infer<typeof spaceTokenMapSchema>;

export const elevationTokenMapSchema = z
  .object({
    shadow: z.string().min(1),
    shadowHover: z.string().min(1),
    insetShadow: z.string().min(1),
  })
  .strict();

export type ElevationTokenMap = z.infer<typeof elevationTokenMapSchema>;

export const motionTokenMapSchema = z
  .object({
    durationFast: z.string().min(1),
    durationNormal: z.string().min(1),
    easing: z.string().min(1),
  })
  .strict();

export type MotionTokenMap = z.infer<typeof motionTokenMapSchema>;

export const chromeTokenMapSchema = z
  .object({
    blur: z.string().min(1).optional(),
    topbarOffset: z.string().min(1).optional(),
  })
  .strict();

export type ChromeTokenMap = z.infer<typeof chromeTokenMapSchema>;

/** Partial token patch produced by a theme option choice. */
export const themeOptionTokenPatchSchema = z
  .object({
    colors: z.partialRecord(colorModeSchema, colorTokenMapSchema.partial()).optional(),
    radii: radiusTokenMapSchema.partial().optional(),
    chrome: chromeTokenMapSchema.optional(),
    motion: motionTokenMapSchema.partial().optional(),
  })
  .strict();

export type ThemeOptionTokenPatch = z.infer<typeof themeOptionTokenPatchSchema>;

export const themeOptionToggleSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.literal('toggle'),
    label: themeLocaleTextSchema,
    description: themeLocaleTextSchema.optional(),
    default: z.boolean(),
    whenTrue: themeOptionTokenPatchSchema.optional(),
  })
  .strict();

export const themeOptionSelectChoiceSchema = z
  .object({
    id: z.string().min(1).max(64),
    label: themeLocaleTextSchema,
    tokens: themeOptionTokenPatchSchema.optional(),
  })
  .strict();

export const themeOptionSelectSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.literal('select'),
    label: themeLocaleTextSchema,
    description: themeLocaleTextSchema.optional(),
    default: z.string().min(1).max(64),
    choices: z.array(themeOptionSelectChoiceSchema).min(1).max(16),
  })
  .strict();

export const themeOptionDefSchema = z.discriminatedUnion('type', [
  themeOptionToggleSchema,
  themeOptionSelectSchema,
]);

export type ThemeOptionDef = z.infer<typeof themeOptionDefSchema>;

/** Selected values for theme options: toggle → boolean, select → choice id. */
export const themeOptionValuesSchema = z.record(
  z.string().min(1),
  z.union([z.boolean(), z.string().min(1).max(64)]),
);

export type ThemeOptionValues = z.infer<typeof themeOptionValuesSchema>;

/**
 * Theme Pack shape (Phase A–D).
 * Optional cssSnippet is validated with the same rules as user snippets.
 */
export const themePackSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9][a-z0-9._-]*$/i, 'Theme pack id must be alphanumeric with . _ -'),
    version: z.string().min(1).max(32),
    name: themeLocaleTextSchema,
    description: themeLocaleTextSchema.optional(),
    tokens: z
      .object({
        colors: z.record(colorModeSchema, colorTokenMapSchema),
        fonts: fontTokenMapSchema.optional(),
        radii: radiusTokenMapSchema.optional(),
        space: spaceTokenMapSchema.optional(),
        elevation: z.partialRecord(colorModeSchema, elevationTokenMapSchema).optional(),
        motion: motionTokenMapSchema.optional(),
        chrome: chromeTokenMapSchema.optional(),
      })
      .strict()
      .superRefine((tokens, ctx) => {
        if (!tokens.colors.light || !tokens.colors.dark) {
          ctx.addIssue({
            code: 'custom',
            message: 'Theme Pack colors must define both light and dark palettes.',
            path: ['colors'],
          });
        }
      }),
    options: z.array(themeOptionDefSchema).max(32).optional(),
    layoutProfileId: layoutProfileIdSchema.optional(),
    cssSnippet: z.string().max(MAX_CSS_SNIPPET_CHARS).optional(),
  })
  .strict()
  .superRefine((pack, ctx) => {
    if (!pack.cssSnippet) return;
    const result = validateCssSnippet(pack.cssSnippet);
    if (!result.ok) {
      for (const message of result.errors) {
        ctx.addIssue({ code: 'custom', message, path: ['cssSnippet'] });
      }
    }
  });

export type ThemePack = z.infer<typeof themePackSchema>;

export const importedThemePacksSchema = z.array(themePackSchema).max(24);
export type ImportedThemePacks = z.infer<typeof importedThemePacksSchema>;

/** On-disk / download envelope for `.cardo-theme.json`. */
export const themePackDocumentSchema = z
  .object({
    format: z.literal('cardo-theme'),
    version: z.literal(1),
    pack: themePackSchema,
  })
  .strict();

export type ThemePackDocument = z.infer<typeof themePackDocumentSchema>;

export const THEME_PACK_DOCUMENT_FORMAT = 'cardo-theme' as const;
export const THEME_PACK_DOCUMENT_VERSION = 1 as const;
export const MAX_THEME_PACK_JSON_BYTES = 256_000;

/** Required entry filename inside a theme directory pack (`themes/<name>/…`). */
export const THEME_PACK_ENTRY_FILENAME = 'theme.cardo-theme.json';

/** Flat-file extension for single-file packs under the themes drop folder. */
export const THEME_FILE_EXTENSION = '.cardo-theme.json';

/** Official built-in Theme Pack ids — frozen, never overwritten by disk/import. */
export const OFFICIAL_BUILT_IN_THEME_IDS: ReadonlySet<string> = new Set([
  'classic',
  'github',
  'one',
  'nord',
  'solarized',
  'paper',
  'graphite',
  'material',
  'apple',
]);

/** CSS custom property names written by the Theme Runtime. */
export const colorCssVariableNames = {
  canvas: '--cardo-canvas',
  surface: '--cardo-surface',
  surfaceStrong: '--cardo-surface-strong',
  panel: '--cardo-panel',
  panelBottom: '--cardo-panel-bottom',
  panelContent: '--cardo-panel-content',
  panelChrome: '--cardo-panel-chrome',
  border: '--cardo-border',
  borderSubtle: '--cardo-border-subtle',
  divider: '--cardo-divider',
  text: '--cardo-text',
  softText: '--cardo-soft-text',
  secondaryText: '--cardo-secondary-text',
  muted: '--cardo-muted',
  hover: '--cardo-hover',
  active: '--cardo-active',
  input: '--cardo-input',
  itemHover: '--cardo-item-hover',
  glyph: '--cardo-glyph',
  neutralButton: '--cardo-neutral-button',
  neutralButtonHover: '--cardo-neutral-button-hover',
  createBackground: '--cardo-create-background',
  createText: '--cardo-create-text',
  scrollbar: '--cardo-scrollbar',
  scrollbarHover: '--cardo-scrollbar-hover',
  selectionRing: '--cardo-selection-ring',
  blue: '--cardo-blue',
  orange: '--cardo-orange',
  purple: '--cardo-purple',
  emerald: '--cardo-emerald',
  red: '--cardo-red',
} as const satisfies Record<keyof ColorTokenMap, string>;

export const radiusCssVariableNames = {
  xs: '--cardo-radius-xs',
  sm: '--cardo-radius-sm',
  md: '--cardo-radius-md',
  lg: '--cardo-radius-lg',
  xl: '--cardo-radius-xl',
  pill: '--cardo-radius-pill',
} as const satisfies Record<keyof RadiusTokenMap, string>;

export const spaceCssVariableNames = {
  1: '--cardo-space-1',
  2: '--cardo-space-2',
  3: '--cardo-space-3',
  4: '--cardo-space-4',
  5: '--cardo-space-5',
  6: '--cardo-space-6',
  7: '--cardo-space-7',
  8: '--cardo-space-8',
} as const satisfies Record<keyof SpaceTokenMap, string>;

export const elevationCssVariableNames = {
  shadow: '--cardo-shadow',
  shadowHover: '--cardo-shadow-hover',
  insetShadow: '--cardo-inset-shadow',
} as const satisfies Record<keyof ElevationTokenMap, string>;

export const motionCssVariableNames = {
  durationFast: '--cardo-duration-fast',
  durationNormal: '--cardo-duration-normal',
  easing: '--cardo-easing',
} as const satisfies Record<keyof MotionTokenMap, string>;
