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
 * Curated looks per official theme pack.
 *
 * - id "default": empty maps → 100% pack tokens (do not invent a second default).
 * - other ids: accent variants only (blue / create / settingsHover).
 *   Shell surfaces stay the pack’s designed neutrals so global hierarchy is preserved.
 */
export const THEME_LOOK_PRESETS: Record<string, readonly ThemeLookPreset[]> = {
  classic: [
    {
      id: 'default',
      name: { en: 'Default', zh: '默认' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'ocean',
      name: { en: 'Ocean', zh: '海雾' },
      // Cool sky blue on classic glass neutrals.
      colors: accentOnly(
        { blue: '#2563eb', create: '#1d4ed8', hover: '#dbeafe' },
        { blue: '#60a5fa', create: '#60a5fa', hover: '#1e3a5f' },
      ),
    },
    {
      id: 'sunset',
      name: { en: 'Sunset', zh: '暮光' },
      // Warm amber accent — same shell, different action color.
      colors: accentOnly(
        { blue: '#d97706', create: '#b45309', hover: '#fef3c7' },
        { blue: '#fbbf24', create: '#fbbf24', hover: '#422006' },
      ),
    },
    {
      id: 'forest',
      name: { en: 'Forest', zh: '林间' },
      // Evergreen accent for a calmer primary.
      colors: accentOnly(
        { blue: '#059669', create: '#047857', hover: '#d1fae5' },
        { blue: '#34d399', create: '#34d399', hover: '#14532d' },
      ),
    },
  ],

  glass: [
    {
      id: 'default',
      name: { en: 'Ethereal', zh: '空灵' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'aurora',
      name: { en: 'Aurora', zh: '极光' },
      // Soft indigo accent on ethereal glass shell.
      colors: accentOnly(
        { blue: '#6366f1', create: '#4f46e5', hover: '#e0e7ff' },
        { blue: '#a5b4fc', create: '#a5b4fc', hover: '#312e81' },
      ),
    },
    {
      id: 'frost',
      name: { en: 'Frost', zh: '霜白' },
      // Ice sky accent.
      colors: accentOnly(
        { blue: '#0ea5e9', create: '#0284c7', hover: '#e0f2fe' },
        { blue: '#38bdf8', create: '#38bdf8', hover: '#0c4a6e' },
      ),
    },
    {
      id: 'ember',
      name: { en: 'Ember', zh: '余烬' },
      // Rose accent — restrained, not neon pink shell.
      colors: accentOnly(
        { blue: '#e11d48', create: '#be123c', hover: '#ffe4e6' },
        { blue: '#fb7185', create: '#fb7185', hover: '#4c0519' },
      ),
    },
  ],

  fluent: [
    {
      id: 'default',
      name: { en: 'System', zh: '系统' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'daylight',
      name: { en: 'Blue', zh: '蓝色' },
      // Windows accent blue (pack default is already close; kept as explicit option).
      colors: accentOnly(
        { blue: '#0078d4', create: '#0078d4', hover: '#e8f3fc' },
        { blue: '#60cdff', create: '#60cdff', hover: '#1b3a4d' },
      ),
    },
    {
      id: 'moss',
      name: { en: 'Green', zh: '绿色' },
      // Windows green accent on stock Fluent neutrals.
      colors: accentOnly(
        { blue: '#107c10', create: '#0f7b0f', hover: '#dff6dd' },
        { blue: '#6ccb5f', create: '#6ccb5f', hover: '#1f3d1f' },
      ),
    },
    {
      id: 'orchid',
      name: { en: 'Purple', zh: '紫色' },
      // Windows purple / orchid accent.
      colors: accentOnly(
        { blue: '#744da9', create: '#744da9', hover: '#f0e8f8' },
        { blue: '#b6a0ff', create: '#b6a0ff', hover: '#2e2445' },
      ),
    },
  ],

  material: [
    {
      id: 'default',
      name: { en: 'Default', zh: '默认' },
      // Pack default is already Google blue — no extra "Blue" look (would duplicate).
      colors: { light: {}, dark: {} },
    },
    {
      id: 'tonal',
      name: { en: 'Green', zh: '绿色' },
      colors: accentOnly(
        { blue: '#188038', create: '#137333', hover: '#e6f4ea' },
        { blue: '#81c995', create: '#81c995', hover: '#1f3a28' },
      ),
    },
    {
      id: 'orchid',
      name: { en: 'Purple', zh: '紫色' },
      // Pack purple accent — distinct from default blue.
      colors: accentOnly(
        { blue: '#9334e6', create: '#7c2fd0', hover: '#f3e8fd' },
        { blue: '#c58af9', create: '#c58af9', hover: '#3a2452' },
      ),
    },
    {
      id: 'dynamic',
      name: { en: 'Coral', zh: '珊瑚红' },
      colors: accentOnly(
        { blue: '#d93025', create: '#c5221f', hover: '#fce8e6' },
        { blue: '#f28b82', create: '#f28b82', hover: '#3d2422' },
      ),
    },
  ],

  swiftui: [
    {
      id: 'default',
      name: { en: 'System', zh: '系统' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'indigo',
      name: { en: 'Indigo', zh: '靛蓝' },
      // Apple system indigo on SF gray shell.
      colors: accentOnly(
        { blue: '#5856d6', create: '#5856d6', hover: '#e8e7f4' },
        { blue: '#5e5ce6', create: '#5e5ce6', hover: '#2c2b44' },
      ),
    },
    {
      id: 'teal',
      name: { en: 'Teal', zh: '青色' },
      // Apple system teal / cyan.
      colors: accentOnly(
        { blue: '#30b0c7', create: '#30b0c7', hover: '#dff3f7' },
        { blue: '#64d2ff', create: '#64d2ff', hover: '#1e3640' },
      ),
    },
    {
      id: 'pink',
      name: { en: 'Pink', zh: '粉色' },
      // Apple system pink.
      colors: accentOnly(
        { blue: '#ff2d55', create: '#ff2d55', hover: '#ffe0e8' },
        { blue: '#ff375f', create: '#ff375f', hover: '#3d1c28' },
      ),
    },
  ],

  codex: [
    {
      id: 'default',
      name: { en: 'Default', zh: '默认' },
      colors: { light: {}, dark: {} },
    },
  ],
};

export function getThemeLookPresets(themeId: string): readonly ThemeLookPreset[] {
  return THEME_LOOK_PRESETS[themeId] ?? THEME_LOOK_PRESETS.classic;
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
