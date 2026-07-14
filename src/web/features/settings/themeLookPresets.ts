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
 * Curated looks for the sole official theme pack (codex).
 * Product UI only exposes the default look (no multi-preset picker).
 */
/** Official default only — multi-look / custom accent pickers removed from product UI. */
export const THEME_LOOK_PRESETS: Record<string, readonly ThemeLookPreset[]> = {
  codex: [
    {
      id: 'default',
      name: { en: 'Default', zh: '默认' },
      colors: { light: {}, dark: {} },
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
