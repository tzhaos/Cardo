import type { OverridableColorMap } from '../../../core/contracts/themePack';
import type { ColorMode } from '../../../core/contracts/preferences';
import { normalizeCssColor } from './colorPresets';

export interface ThemeLookPreset {
  id: string;
  name: { en: string; zh: string };
  /**
   * Designed light/dark pair for this pack.
   * Empty maps mean pack defaults (no overrides) — the official default look.
   */
  colors: Record<ColorMode, OverridableColorMap>;
}

/**
 * Accent-only helper: leave canvas / panel / text to the pack default.
 * Extra looks must not redesign the shell — defaults are the designed product.
 */
function accentOnly(
  light: { blue: string; create?: string; hover: string },
  dark: { blue: string; create?: string; hover: string },
): Record<ColorMode, OverridableColorMap> {
  return {
    light: {
      blue: light.blue,
      createBackground: light.create ?? light.blue,
      settingsHover: light.hover,
    },
    dark: {
      blue: dark.blue,
      createBackground: dark.create ?? dark.blue,
      settingsHover: dark.hover,
    },
  };
}

/**
 * Curated looks for the sole official theme pack (codex).
 *
 * - id "default": empty maps → 100% pack tokens.
 * - other ids: accent variants only (blue / create / settingsHover).
 */
export const THEME_LOOK_PRESETS: Record<string, readonly ThemeLookPreset[]> = {
  codex: [
    {
      id: 'default',
      name: { en: 'Default', zh: '默认' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'ocean',
      name: { en: 'Ocean', zh: '海雾' },
      colors: accentOnly(
        { blue: '#2563eb', create: '#1d4ed8', hover: '#dbeafe' },
        { blue: '#60a5fa', create: '#60a5fa', hover: '#1e3a5f' },
      ),
    },
    {
      id: 'sunset',
      name: { en: 'Sunset', zh: '暮光' },
      colors: accentOnly(
        { blue: '#d97706', create: '#b45309', hover: '#fef3c7' },
        { blue: '#fbbf24', create: '#fbbf24', hover: '#422006' },
      ),
    },
    {
      id: 'forest',
      name: { en: 'Forest', zh: '林间' },
      colors: accentOnly(
        { blue: '#059669', create: '#047857', hover: '#d1fae5' },
        { blue: '#34d399', create: '#34d399', hover: '#14532d' },
      ),
    },
  ],
};

export function getThemeLookPresets(themeId: string): readonly ThemeLookPreset[] {
  return THEME_LOOK_PRESETS[themeId] ?? THEME_LOOK_PRESETS.codex;
}

/** True when theme has no color overrides for either mode. */
export function isDefaultLookActive(
  light: OverridableColorMap | undefined,
  dark: OverridableColorMap | undefined,
): boolean {
  return Object.keys(light ?? {}).length === 0 && Object.keys(dark ?? {}).length === 0;
}

/**
 * Match the designed look that equals both light and dark override maps.
 * Falls back to null when the user has a custom mix of tokens.
 */
export function matchThemeLookId(
  themeId: string,
  light: OverridableColorMap | undefined,
  dark: OverridableColorMap | undefined,
): string | null {
  if (isDefaultLookActive(light, dark)) return 'default';
  const looks = getThemeLookPresets(themeId);
  for (const look of looks) {
    if (look.id === 'default') continue;
    if (mapsEqual(look.colors.light, light ?? {}) && mapsEqual(look.colors.dark, dark ?? {})) {
      return look.id;
    }
  }
  return null;
}

function mapsEqual(a: OverridableColorMap, b: OverridableColorMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const left = a[key as keyof OverridableColorMap];
    const right = b[key as keyof OverridableColorMap];
    if (left == null && right == null) continue;
    if (left == null || right == null) return false;
    if (normalizeCssColor(left) !== normalizeCssColor(right)) return false;
  }
  return true;
}
