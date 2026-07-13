import type { ColorMode } from '../../core/contracts/preferences';
import type {
  ChromeTokenMap,
  ColorTokenMap,
  MotionTokenMap,
  RadiusTokenMap,
  ThemeColorOverrides,
  ThemeOptionDef,
  ThemeOptionTokenPatch,
  ThemeOptionValues,
  ThemePack,
} from '../../core/contracts/themePack';
import {
  DEFAULT_ACCENT_COLORS,
  DEFAULT_ELEVATION_DARK,
  DEFAULT_ELEVATION_LIGHT,
  DEFAULT_FONT_TOKENS,
  DEFAULT_MOTION_TOKENS,
  DEFAULT_RADIUS_TOKENS,
  DEFAULT_SPACE_TOKENS,
} from './defaultTokens';

export interface ResolvedThemeTokens {
  colors: ColorTokenMap;
  radii: RadiusTokenMap;
  fonts: NonNullable<ThemePack['tokens']['fonts']>;
  space: NonNullable<ThemePack['tokens']['space']>;
  elevation: NonNullable<ThemePack['tokens']['elevation']> extends infer _E
    ? {
        shadow: string;
        shadowHover: string;
        insetShadow: string;
      }
    : never;
  motion: MotionTokenMap;
  chrome: ChromeTokenMap;
}

/**
 * effective = basePack.tokens ⊕ userOverrides ⊕ optionResolvedTokens
 */
export function resolveEffectiveThemeTokens(input: {
  pack: ThemePack;
  colorMode: ColorMode;
  colorOverrides?: ThemeColorOverrides;
  optionValues?: ThemeOptionValues;
}): ResolvedThemeTokens {
  const { pack, colorMode } = input;
  const baseColors = pack.tokens.colors[colorMode];
  if (!baseColors) {
    throw new Error(`Theme pack "${pack.id}" is missing the ${colorMode} palette.`);
  }

  let colors: ColorTokenMap = {
    ...DEFAULT_ACCENT_COLORS,
    ...baseColors,
  };
  let radii: RadiusTokenMap = { ...(pack.tokens.radii ?? DEFAULT_RADIUS_TOKENS) };
  let motion: MotionTokenMap = { ...(pack.tokens.motion ?? DEFAULT_MOTION_TOKENS) };
  let chrome: ChromeTokenMap = {
    ...(pack.tokens.chrome ?? { blur: '18px', topbarOffset: '12px' }),
  };

  const optionPatches = collectOptionPatches(pack.options ?? [], input.optionValues ?? {});
  for (const patch of optionPatches) {
    const next = applyTokenPatch(colors, radii, motion, chrome, patch, colorMode);
    colors = next.colors;
    radii = next.radii;
    motion = next.motion;
    chrome = next.chrome;
  }

  const userModeOverrides = input.colorOverrides?.[pack.id]?.[colorMode];
  if (userModeOverrides) {
    colors = applyUserColorOverrides(colors, userModeOverrides);
  }

  const elevation =
    pack.tokens.elevation?.[colorMode] ??
    (colorMode === 'dark' ? DEFAULT_ELEVATION_DARK : DEFAULT_ELEVATION_LIGHT);

  return {
    colors,
    radii,
    fonts: pack.tokens.fonts ?? DEFAULT_FONT_TOKENS,
    space: pack.tokens.space ?? DEFAULT_SPACE_TOKENS,
    elevation,
    motion,
    chrome,
  };
}

function collectOptionPatches(
  options: ThemeOptionDef[],
  values: ThemeOptionValues,
): ThemeOptionTokenPatch[] {
  const patches: ThemeOptionTokenPatch[] = [];
  for (const option of options) {
    if (option.type === 'toggle') {
      const enabled = typeof values[option.id] === 'boolean' ? values[option.id] : option.default;
      if (enabled && option.whenTrue) patches.push(option.whenTrue);
      continue;
    }
    const choiceId =
      typeof values[option.id] === 'string' ? (values[option.id] as string) : option.default;
    const choice = option.choices.find((entry) => entry.id === choiceId) ?? option.choices[0];
    if (choice?.tokens) patches.push(choice.tokens);
  }
  return patches;
}

function applyTokenPatch(
  colors: ColorTokenMap,
  radii: RadiusTokenMap,
  motion: MotionTokenMap,
  chrome: ChromeTokenMap,
  patch: ThemeOptionTokenPatch,
  colorMode: ColorMode,
) {
  const colorPatch = patch.colors?.[colorMode];
  return {
    colors: colorPatch ? { ...colors, ...stripUndefined(colorPatch) } : colors,
    radii: patch.radii ? { ...radii, ...stripUndefined(patch.radii) } : radii,
    motion: patch.motion ? { ...motion, ...stripUndefined(patch.motion) } : motion,
    chrome: patch.chrome ? { ...chrome, ...stripUndefined(patch.chrome) } : chrome,
  };
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      result[key as keyof T] = entry as T[keyof T];
    }
  }
  return result;
}

/**
 * Merge user color looks onto the pack palette and derive companion tokens so a
 * look always changes chrome (accent wash, selection, soft text) visibly.
 */
function applyUserColorOverrides(
  base: ColorTokenMap,
  overrides: Partial<ColorTokenMap>,
): ColorTokenMap {
  const patch = stripUndefined(overrides as Record<string, unknown>) as Partial<ColorTokenMap>;
  const next: ColorTokenMap = { ...base, ...patch };

  if (patch.blue) {
    // Accent-linked chrome that looks never set explicitly.
    next.active = `color-mix(in srgb, ${patch.blue} 18%, transparent)`;
    next.selectionRing = patch.blue;
    next.itemHover = `color-mix(in srgb, ${patch.blue} 10%, ${next.panel})`;
    if (!patch.createBackground) {
      next.createBackground = patch.blue;
    }
  }
  if (patch.text) {
    next.softText = `color-mix(in srgb, ${patch.text} 82%, ${next.canvas})`;
    next.secondaryText = `color-mix(in srgb, ${patch.text} 68%, ${next.canvas})`;
    next.muted = `color-mix(in srgb, ${patch.text} 52%, ${next.canvas})`;
  }
  if (patch.canvas && !patch.hover) {
    next.hover = `color-mix(in srgb, ${patch.canvas} 88%, ${patch.text ?? next.text})`;
  }
  if (patch.panel) {
    next.panelBottom = patch.panel;
    next.panelContent = patch.panel;
    next.panelChrome = patch.settingsChrome ?? patch.panel;
  }
  if (patch.surface) {
    next.surfaceStrong = patch.surface;
  }
  if (patch.settingsHover) {
    next.neutralButtonHover = patch.settingsHover;
  }

  return next;
}

export function getDefaultOptionValues(options: ThemeOptionDef[] | undefined): ThemeOptionValues {
  const defaults: ThemeOptionValues = {};
  for (const option of options ?? []) {
    defaults[option.id] = option.default;
  }
  return defaults;
}
