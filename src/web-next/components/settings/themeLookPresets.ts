import type { OverridableColorMap } from '../../../core/contracts/themePack';
import type { ColorMode } from '../../../core/contracts/preferences';
import { normalizeCssColor } from './colorPresets';

export interface ThemeLookPreset {
  id: string;
  name: { en: string; zh: string };
  /**
   * Designed light/dark pair for this pack.
   * Empty maps mean pack defaults (no overrides).
   */
  colors: Record<ColorMode, OverridableColorMap>;
}

/**
 * Curated looks — one coherent palette family per option.
 *
 * Design rules (all packs):
 * 1. Keep shell hierarchy: canvas (recessed) → panel (raised) → surface (chrome).
 * 2. Body text stays near-neutral for reading; accent is for actions / selection only.
 * 3. Light and dark of the same look share hue identity (same family, not two random themes).
 * 4. settingsChrome / settingsHover sit in the same family as canvas, slightly quieter.
 * 5. createBackground matches accent (or one step deeper in light mode for contrast).
 * 6. Respect each pack’s design language (Fluent neutrals, Material tonal, Apple system, …).
 */
export const THEME_LOOK_PRESETS: Record<string, readonly ThemeLookPreset[]> = {
  /**
   * Classic — soft product glass.
   * Looks shift the neutral temperature + one restrained accent; panels stay clean.
   */
  classic: [
    {
      id: 'default',
      name: { en: 'Default', zh: '默认' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'slate',
      name: { en: 'Slate', zh: '青灰' },
      // Cool slate neutrals + calm sky accent (desktop utility, low noise).
      colors: {
        light: {
          canvas: '#eef1f5',
          panel: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.88)',
          text: '#152033',
          blue: '#3b6fd4',
          createBackground: '#2f5bb8',
          settingsChrome: '#f3f5f8',
          settingsHover: '#e2e8f2',
        },
        dark: {
          canvas: '#14181f',
          panel: '#1e2430',
          surface: 'rgba(30, 36, 48, 0.92)',
          text: '#e8edf5',
          blue: '#7aa2f0',
          createBackground: '#7aa2f0',
          settingsChrome: '#171c26',
          settingsHover: '#283246',
        },
      },
    },
    {
      id: 'sand',
      name: { en: 'Sand', zh: '沙色' },
      // Warm stone neutrals + copper accent (paper / reading mood).
      colors: {
        light: {
          canvas: '#f3efe9',
          panel: '#fffcf8',
          surface: 'rgba(255, 252, 248, 0.92)',
          text: '#2a2118',
          blue: '#c46a2d',
          createBackground: '#a85a26',
          settingsChrome: '#f7f3ee',
          settingsHover: '#ebe2d6',
        },
        dark: {
          canvas: '#171310',
          panel: '#241e19',
          surface: 'rgba(36, 30, 25, 0.94)',
          text: '#f3ebe2',
          blue: '#e0a06a',
          createBackground: '#e0a06a',
          settingsChrome: '#1b1612',
          settingsHover: '#342a22',
        },
      },
    },
    {
      id: 'sage',
      name: { en: 'Sage', zh: '鼠尾草' },
      // Muted sage neutrals + evergreen accent (calm workspace).
      colors: {
        light: {
          canvas: '#eef2ef',
          panel: '#fbfcfb',
          surface: 'rgba(251, 252, 251, 0.92)',
          text: '#1a2620',
          blue: '#3d7a5c',
          createBackground: '#32664c',
          settingsChrome: '#f3f6f4',
          settingsHover: '#dde8e1',
        },
        dark: {
          canvas: '#121816',
          panel: '#1b2420',
          surface: 'rgba(27, 36, 32, 0.94)',
          text: '#e4efe8',
          blue: '#7dba98',
          createBackground: '#7dba98',
          settingsChrome: '#151c19',
          settingsHover: '#27352e',
        },
      },
    },
  ],

  /**
   * Glass — ethereal atmosphere.
   * Soft tinted canvases + translucent white panels; accent is jewel-toned but not neon.
   */
  glass: [
    {
      id: 'default',
      name: { en: 'Ethereal', zh: '空灵' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'mist',
      name: { en: 'Mist', zh: '薄雾' },
      // Cool blue mist — airy, high clarity.
      colors: {
        light: {
          canvas: '#eef3f8',
          panel: 'rgba(255, 255, 255, 0.82)',
          surface: 'rgba(255, 255, 255, 0.72)',
          text: '#1a2740',
          blue: '#3d7ccc',
          createBackground: '#2f6bb8',
          settingsChrome: '#f5f8fb',
          settingsHover: '#dfeaf5',
        },
        dark: {
          canvas: '#0c121a',
          panel: 'rgba(22, 32, 46, 0.88)',
          surface: 'rgba(28, 40, 56, 0.84)',
          text: '#e6eef8',
          blue: '#7eb3ef',
          createBackground: '#7eb3ef',
          settingsChrome: '#101822',
          settingsHover: '#1e3048',
        },
      },
    },
    {
      id: 'lilac',
      name: { en: 'Lilac', zh: '丁香' },
      // Soft violet glass — atmospheric, not party-purple.
      colors: {
        light: {
          canvas: '#f2f0f8',
          panel: 'rgba(255, 255, 255, 0.84)',
          surface: 'rgba(255, 255, 255, 0.74)',
          text: '#241f3a',
          blue: '#6b5bb5',
          createBackground: '#5a4ba0',
          settingsChrome: '#f6f4fb',
          settingsHover: '#e6e1f4',
        },
        dark: {
          canvas: '#12101a',
          panel: 'rgba(30, 26, 44, 0.9)',
          surface: 'rgba(38, 32, 56, 0.86)',
          text: '#ece8f8',
          blue: '#b0a3ef',
          createBackground: '#b0a3ef',
          settingsChrome: '#161320',
          settingsHover: '#2c2644',
        },
      },
    },
    {
      id: 'rose',
      name: { en: 'Rose', zh: '蔷薇' },
      // Dusty rose glass — warm atmosphere without candy pink.
      colors: {
        light: {
          canvas: '#f7f0f2',
          panel: 'rgba(255, 255, 255, 0.86)',
          surface: 'rgba(255, 252, 253, 0.78)',
          text: '#2e1c24',
          blue: '#b85a78',
          createBackground: '#9e4a66',
          settingsChrome: '#faf5f7',
          settingsHover: '#f0dde4',
        },
        dark: {
          canvas: '#160e12',
          panel: 'rgba(36, 22, 30, 0.9)',
          surface: 'rgba(46, 28, 38, 0.88)',
          text: '#f6e8ee',
          blue: '#e09bb2',
          createBackground: '#e09bb2',
          settingsChrome: '#1a1116',
          settingsHover: '#3a2430',
        },
      },
    },
  ],

  /**
   * Fluent — Windows 11.
   * Official pattern: neutral shell (#f3f3f3 / #202020 family) + system accent color only.
   * Do not recolor the whole canvas like a Material seed — Fluent keeps chrome gray.
   */
  fluent: [
    {
      id: 'default',
      name: { en: 'System', zh: '系统' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'blue',
      name: { en: 'Blue', zh: '蓝色' },
      // Windows accent blue on stock neutrals.
      colors: {
        light: {
          canvas: '#f3f3f3',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1a1a1a',
          blue: '#0078d4',
          createBackground: '#0078d4',
          settingsChrome: '#ffffff',
          settingsHover: '#e8f3fc',
        },
        dark: {
          canvas: '#202020',
          panel: '#2c2c2c',
          surface: '#2c2c2c',
          text: '#ffffff',
          blue: '#60cdff',
          createBackground: '#60cdff',
          settingsChrome: '#202020',
          settingsHover: '#1b3a4d',
        },
      },
    },
    {
      id: 'teal',
      name: { en: 'Teal', zh: '青色' },
      // Windows teal accent.
      colors: {
        light: {
          canvas: '#f3f3f3',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1a1a1a',
          blue: '#038387',
          createBackground: '#038387',
          settingsChrome: '#ffffff',
          settingsHover: '#dff6f7',
        },
        dark: {
          canvas: '#202020',
          panel: '#2c2c2c',
          surface: '#2c2c2c',
          text: '#ffffff',
          blue: '#00b7c3',
          createBackground: '#00b7c3',
          settingsChrome: '#202020',
          settingsHover: '#0f3a3d',
        },
      },
    },
    {
      id: 'purple',
      name: { en: 'Purple', zh: '紫色' },
      // Windows orchid / purple accent.
      colors: {
        light: {
          canvas: '#f3f3f3',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1a1a1a',
          blue: '#744da9',
          createBackground: '#744da9',
          settingsChrome: '#ffffff',
          settingsHover: '#f0e8f8',
        },
        dark: {
          canvas: '#202020',
          panel: '#2c2c2c',
          surface: '#2c2c2c',
          text: '#ffffff',
          blue: '#b6a0ff',
          createBackground: '#b6a0ff',
          settingsChrome: '#202020',
          settingsHover: '#2e2445',
        },
      },
    },
  ],

  /**
   * Material — AI Studio / Material You tone.
   * Tonal surfaces are subtle (not full-chroma wallpaper). On-surface text stays readable.
   * Accent drives primary actions and settings hover wash only.
   */
  material: [
    {
      id: 'default',
      name: { en: 'Baseline', zh: '基线' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'sky',
      name: { en: 'Sky', zh: '晴空' },
      colors: {
        light: {
          canvas: '#f4f7fb',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1a1c1e',
          blue: '#1a73e8',
          createBackground: '#1a73e8',
          settingsChrome: '#f8fafc',
          settingsHover: '#e8f0fe',
        },
        dark: {
          canvas: '#111316',
          panel: '#1c1f24',
          surface: '#22262c',
          text: '#e3e3e3',
          blue: '#8ab4f8',
          createBackground: '#8ab4f8',
          settingsChrome: '#181b20',
          settingsHover: '#243247',
        },
      },
    },
    {
      id: 'meadow',
      name: { en: 'Meadow', zh: '草地' },
      colors: {
        light: {
          canvas: '#f3f7f4',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1a1c1a',
          blue: '#137333',
          createBackground: '#137333',
          settingsChrome: '#f6faf7',
          settingsHover: '#e6f4ea',
        },
        dark: {
          canvas: '#111413',
          panel: '#1b211d',
          surface: '#222a25',
          text: '#e3e3e3',
          blue: '#81c995',
          createBackground: '#81c995',
          settingsChrome: '#161b18',
          settingsHover: '#1f3a28',
        },
      },
    },
    {
      id: 'terracotta',
      name: { en: 'Terracotta', zh: '赤陶' },
      // Warm primary with neutral on-surface (not red body text).
      colors: {
        light: {
          canvas: '#f8f4f2',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1c1917',
          blue: '#c5221f',
          createBackground: '#b3261e',
          settingsChrome: '#faf7f6',
          settingsHover: '#fce8e6',
        },
        dark: {
          canvas: '#161211',
          panel: '#221c1b',
          surface: '#2a2322',
          text: '#e8e2e0',
          blue: '#f2b8b5',
          createBackground: '#f2b8b5',
          settingsChrome: '#1a1514',
          settingsHover: '#3d2422',
        },
      },
    },
  ],

  /**
   * SwiftUI — Apple system accents on system gray canvas.
   * Shell stays SF gray; only accent + active wash change (true to iOS/macOS Settings).
   */
  swiftui: [
    {
      id: 'default',
      name: { en: 'Blue', zh: '蓝色' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'indigo',
      name: { en: 'Indigo', zh: '靛蓝' },
      colors: {
        light: {
          canvas: '#ececf0',
          panel: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.78)',
          text: '#1d1d1f',
          blue: '#5856d6',
          createBackground: '#5856d6',
          settingsChrome: '#f5f5f7',
          settingsHover: '#e8e7f4',
        },
        dark: {
          canvas: '#1c1c1e',
          panel: '#2c2c2e',
          surface: 'rgba(44, 44, 46, 0.82)',
          text: '#f5f5f7',
          blue: '#5e5ce6',
          createBackground: '#5e5ce6',
          settingsChrome: '#1c1c1e',
          settingsHover: '#2c2b44',
        },
      },
    },
    {
      id: 'teal',
      name: { en: 'Teal', zh: '青色' },
      colors: {
        light: {
          canvas: '#ececf0',
          panel: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.78)',
          text: '#1d1d1f',
          blue: '#30b0c7',
          createBackground: '#30b0c7',
          settingsChrome: '#f5f5f7',
          settingsHover: '#dff3f7',
        },
        dark: {
          canvas: '#1c1c1e',
          panel: '#2c2c2e',
          surface: 'rgba(44, 44, 46, 0.82)',
          text: '#f5f5f7',
          blue: '#64d2ff',
          createBackground: '#64d2ff',
          settingsChrome: '#1c1c1e',
          settingsHover: '#1e3640',
        },
      },
    },
    {
      id: 'orange',
      name: { en: 'Orange', zh: '橙色' },
      // Apple system orange — warmer alternative to pink candy.
      colors: {
        light: {
          canvas: '#ececf0',
          panel: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.78)',
          text: '#1d1d1f',
          blue: '#ff9500',
          createBackground: '#ff9500',
          settingsChrome: '#f5f5f7',
          settingsHover: '#ffecd2',
        },
        dark: {
          canvas: '#1c1c1e',
          panel: '#2c2c2e',
          surface: 'rgba(44, 44, 46, 0.82)',
          text: '#f5f5f7',
          blue: '#ff9f0a',
          createBackground: '#ff9f0a',
          settingsChrome: '#1c1c1e',
          settingsHover: '#3d2e14',
        },
      },
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
    if (
      mapsEqual(look.colors.light, light ?? {}) &&
      mapsEqual(look.colors.dark, dark ?? {})
    ) {
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
