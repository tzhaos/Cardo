import { z } from 'zod';
import { colorModeSchema } from './preferences';

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

export const layoutProfileIds = ['classic', 'compact', 'immersive'] as const;
export const layoutProfileIdSchema = z.enum(layoutProfileIds);
export type LayoutProfileId = z.infer<typeof layoutProfileIdSchema>;

/**
 * Built-in Theme Pack shape (Phase A).
 * Optional fields (options / features / cssSnippet) land in later phases.
 */
export const themePackSchema = z
  .object({
    id: z.string().min(1).max(64),
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
    layoutProfileId: layoutProfileIdSchema.optional(),
  })
  .strict();

export type ThemePack = z.infer<typeof themePackSchema>;

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
