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
  type ThemeColorOverrides,
  type ThemeOptionValues,
  type ThemePack,
} from '../../core/contracts/themePack';
import { DEFAULT_FONT_TOKENS } from './defaultTokens';
import { resolveEffectiveThemeTokens } from './resolveTheme';
import { getThemePack } from './themeRegistry';

export interface ApplyThemeOptions {
  themeId: string;
  colorMode: ColorMode;
  fontFamily?: FontFamilyId;
  fontScale?: FontScale;
  density?: Density;
  colorOverrides?: ThemeColorOverrides;
  optionValues?: ThemeOptionValues;
}

/**
 * Resolve and apply Theme Pack tokens to a document root.
 * Writes only `--cardo-*` variables (no dual-track legacy palette vars).
 */
export function applyTheme(root: HTMLElement, options: ApplyThemeOptions): ThemePack {
  const pack = getThemePack(options.themeId);
  const colorMode = options.colorMode;
  const resolved = resolveEffectiveThemeTokens({
    pack,
    colorMode,
    colorOverrides: options.colorOverrides,
    optionValues: options.optionValues,
  });
  const fontFamilyId = options.fontFamily ?? 'default';
  const fontScale = options.fontScale ?? 'md';
  const density = options.density ?? 'comfortable';

  const chromeBlur = resolved.chrome.blur ?? '18px';
  const chromeMaterial =
    resolved.chrome.material ??
    (isZeroCssLength(chromeBlur) ? 'solid' : 'glass');

  root.dataset.cardoTheme = pack.id;
  root.dataset.theme = pack.id;
  root.dataset.colorMode = colorMode;
  root.dataset.fontFamily = fontFamilyId;
  root.dataset.fontScale = fontScale;
  root.dataset.density = density;
  root.dataset.cardoChromeMaterial = chromeMaterial;
  root.classList.toggle('dark', colorMode === 'dark');
  root.style.colorScheme = colorMode;

  for (const [token, cssVar] of Object.entries(colorCssVariableNames) as Array<
    [keyof ColorTokenMap, string]
  >) {
    const value = resolved.colors[token];
    if (value) root.style.setProperty(cssVar, value);
  }

  for (const [token, cssVar] of Object.entries(radiusCssVariableNames) as Array<
    [keyof typeof resolved.radii, string]
  >) {
    root.style.setProperty(cssVar, resolved.radii[token]);
  }

  const densityFactor = DENSITY_FACTORS[density];
  const spaceKeys = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  for (const token of spaceKeys) {
    root.style.setProperty(
      spaceCssVariableNames[token],
      `calc(${resolved.space[token]} * ${densityFactor})`,
    );
  }

  for (const [token, cssVar] of Object.entries(elevationCssVariableNames) as Array<
    [keyof typeof resolved.elevation, string]
  >) {
    root.style.setProperty(cssVar, resolved.elevation[token]);
  }

  for (const [token, cssVar] of Object.entries(motionCssVariableNames) as Array<
    [keyof typeof resolved.motion, string]
  >) {
    root.style.setProperty(cssVar, resolved.motion[token]);
  }

  const sansStack = FONT_FAMILY_STACKS[fontFamilyId] || resolved.fonts.sans;
  root.style.setProperty('--cardo-font-sans', sansStack);
  root.style.setProperty('--cardo-font-mono', resolved.fonts.mono ?? DEFAULT_FONT_TOKENS.mono);
  root.style.setProperty(
    '--cardo-font-size-base',
    resolved.fonts.sizeBase ?? DEFAULT_FONT_TOKENS.sizeBase!,
  );
  root.style.setProperty(
    '--cardo-line-height-base',
    resolved.fonts.lineHeightBase ?? DEFAULT_FONT_TOKENS.lineHeightBase!,
  );
  root.style.setProperty('--cardo-font-scale', String(FONT_SCALE_FACTORS[fontScale]));
  root.style.setProperty('--cardo-density', String(densityFactor));
  root.style.setProperty('--cardo-chrome-blur', chromeBlur);
  root.style.setProperty('--cardo-topbar-offset', resolved.chrome.topbarOffset ?? '12px');

  return pack;
}

function isZeroCssLength(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed === '0' || trimmed === '0px' || trimmed === '0rem' || trimmed === '0em';
}
