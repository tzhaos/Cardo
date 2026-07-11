import type { ColorMode, Density, FontFamilyId, FontScale } from '../../core/contracts/preferences';
import {
  DENSITY_FACTORS,
  FONT_FAMILY_STACKS,
  FONT_SCALE_FACTORS,
} from '../../core/contracts/preferences';
import {
  colorCssVariableNames,
  elevationCssVariableNames,
  motionCssVariableNames,
  radiusCssVariableNames,
  spaceCssVariableNames,
  type ColorTokenMap,
  type ThemePack,
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
import { getThemePack } from './themeRegistry';

export interface ApplyThemeOptions {
  themeId: string;
  colorMode: ColorMode;
  fontFamily?: FontFamilyId;
  fontScale?: FontScale;
  density?: Density;
}

/**
 * Resolve and apply Theme Pack tokens to a document root.
 * Writes only `--cardo-*` variables (no dual-track legacy palette vars).
 */
export function applyTheme(root: HTMLElement, options: ApplyThemeOptions): ThemePack {
  const pack = getThemePack(options.themeId);
  const colorMode = options.colorMode;
  const colors = resolveColors(pack, colorMode);
  const fonts = pack.tokens.fonts ?? DEFAULT_FONT_TOKENS;
  const radii = pack.tokens.radii ?? DEFAULT_RADIUS_TOKENS;
  const space = pack.tokens.space ?? DEFAULT_SPACE_TOKENS;
  const elevation =
    pack.tokens.elevation?.[colorMode] ??
    (colorMode === 'dark' ? DEFAULT_ELEVATION_DARK : DEFAULT_ELEVATION_LIGHT);
  const motion = pack.tokens.motion ?? DEFAULT_MOTION_TOKENS;
  const fontFamilyId = options.fontFamily ?? 'default';
  const fontScale = options.fontScale ?? 'md';
  const density = options.density ?? 'comfortable';

  root.dataset.cardoTheme = pack.id;
  root.dataset.theme = pack.id;
  root.dataset.colorMode = colorMode;
  root.dataset.fontFamily = fontFamilyId;
  root.dataset.fontScale = fontScale;
  root.dataset.density = density;
  root.classList.toggle('dark', colorMode === 'dark');
  root.style.colorScheme = colorMode;

  for (const [token, cssVar] of Object.entries(colorCssVariableNames) as Array<
    [keyof ColorTokenMap, string]
  >) {
    const value = colors[token];
    if (value) root.style.setProperty(cssVar, value);
  }

  for (const [token, cssVar] of Object.entries(radiusCssVariableNames) as Array<
    [keyof typeof radii, string]
  >) {
    root.style.setProperty(cssVar, radii[token]);
  }

  const densityFactor = DENSITY_FACTORS[density];
  const spaceKeys = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  for (const token of spaceKeys) {
    // Density multiplies the spacing scale once at apply time.
    root.style.setProperty(spaceCssVariableNames[token], `calc(${space[token]} * ${densityFactor})`);
  }

  for (const [token, cssVar] of Object.entries(elevationCssVariableNames) as Array<
    [keyof typeof elevation, string]
  >) {
    root.style.setProperty(cssVar, elevation[token]);
  }

  for (const [token, cssVar] of Object.entries(motionCssVariableNames) as Array<
    [keyof typeof motion, string]
  >) {
    root.style.setProperty(cssVar, motion[token]);
  }

  const sansStack = FONT_FAMILY_STACKS[fontFamilyId] || fonts.sans;
  root.style.setProperty('--cardo-font-sans', sansStack);
  root.style.setProperty('--cardo-font-mono', fonts.mono ?? DEFAULT_FONT_TOKENS.mono);
  root.style.setProperty('--cardo-font-size-base', fonts.sizeBase ?? DEFAULT_FONT_TOKENS.sizeBase!);
  root.style.setProperty(
    '--cardo-line-height-base',
    fonts.lineHeightBase ?? DEFAULT_FONT_TOKENS.lineHeightBase!,
  );
  root.style.setProperty('--cardo-font-scale', String(FONT_SCALE_FACTORS[fontScale]));
  root.style.setProperty('--cardo-density', String(densityFactor));
  root.style.setProperty('--cardo-chrome-blur', pack.tokens.chrome?.blur ?? '18px');
  root.style.setProperty('--cardo-topbar-offset', pack.tokens.chrome?.topbarOffset ?? '12px');

  return pack;
}

function resolveColors(pack: ThemePack, colorMode: ColorMode): ColorTokenMap {
  const palette = pack.tokens.colors[colorMode];
  if (!palette) {
    throw new Error(`Theme pack "${pack.id}" is missing the ${colorMode} palette.`);
  }
  return {
    ...DEFAULT_ACCENT_COLORS,
    ...palette,
  };
}
