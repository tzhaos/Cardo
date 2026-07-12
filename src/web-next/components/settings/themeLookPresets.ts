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
 * Curated multi-token looks per official theme pack.
 * Users pick a look first; fine-grained color rows stay under "Customize".
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
      colors: {
        light: {
          canvas: '#e8f1f8',
          panel: '#ffffff',
          surface: 'rgba(255, 255, 255, 0.86)',
          text: '#0f2744',
          blue: '#0284c7',
          createBackground: '#0369a1',
          settingsChrome: '#f0f7fc',
          settingsHover: '#dbeafe',
        },
        dark: {
          canvas: '#0b1520',
          panel: '#152535',
          surface: 'rgba(21, 37, 53, 0.9)',
          text: '#e2eef8',
          blue: '#38bdf8',
          createBackground: '#0ea5e9',
          settingsChrome: '#0f1c2a',
          settingsHover: '#1e3a5f',
        },
      },
    },
    {
      id: 'sunset',
      name: { en: 'Sunset', zh: '暮光' },
      colors: {
        light: {
          canvas: '#f7efe8',
          panel: '#fffaf6',
          surface: 'rgba(255, 250, 246, 0.9)',
          text: '#3b2418',
          blue: '#ea580c',
          createBackground: '#c2410c',
          settingsChrome: '#faf4ef',
          settingsHover: '#ffedd5',
        },
        dark: {
          canvas: '#1a1210',
          panel: '#2a1c18',
          surface: 'rgba(42, 28, 24, 0.92)',
          text: '#fde8dc',
          blue: '#fb923c',
          createBackground: '#f97316',
          settingsChrome: '#1c1412',
          settingsHover: '#3d2418',
        },
      },
    },
    {
      id: 'forest',
      name: { en: 'Forest', zh: '林间' },
      colors: {
        light: {
          canvas: '#eaf3ec',
          panel: '#f7fbf8',
          surface: 'rgba(247, 251, 248, 0.92)',
          text: '#14301f',
          blue: '#059669',
          createBackground: '#047857',
          settingsChrome: '#f0f7f2',
          settingsHover: '#d1fae5',
        },
        dark: {
          canvas: '#0c1610',
          panel: '#15251b',
          surface: 'rgba(21, 37, 27, 0.92)',
          text: '#dcf5e6',
          blue: '#34d399',
          createBackground: '#10b981',
          settingsChrome: '#101c14',
          settingsHover: '#14532d',
        },
      },
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
      colors: {
        light: {
          canvas: '#eef0ff',
          panel: 'rgba(255, 255, 255, 0.8)',
          surface: 'rgba(255, 255, 255, 0.72)',
          text: '#1e1b4b',
          blue: '#6366f1',
          createBackground: '#4f46e5',
          settingsChrome: '#f4f5ff',
          settingsHover: '#e0e7ff',
        },
        dark: {
          canvas: '#0b0c1a',
          panel: 'rgba(30, 27, 55, 0.88)',
          surface: 'rgba(36, 32, 68, 0.85)',
          text: '#e8e7ff',
          blue: '#a5b4fc',
          createBackground: '#818cf8',
          settingsChrome: '#12122a',
          settingsHover: '#2e2a5a',
        },
      },
    },
    {
      id: 'frost',
      name: { en: 'Frost', zh: '霜白' },
      colors: {
        light: {
          canvas: '#f1f5f9',
          panel: 'rgba(255, 255, 255, 0.88)',
          surface: 'rgba(248, 250, 252, 0.82)',
          text: '#0f172a',
          blue: '#0ea5e9',
          createBackground: '#0284c7',
          settingsChrome: '#f8fafc',
          settingsHover: '#e0f2fe',
        },
        dark: {
          canvas: '#020617',
          panel: 'rgba(15, 23, 42, 0.9)',
          surface: 'rgba(30, 41, 59, 0.86)',
          text: '#f1f5f9',
          blue: '#38bdf8',
          createBackground: '#0ea5e9',
          settingsChrome: '#0b1220',
          settingsHover: '#1e3a5f',
        },
      },
    },
    {
      id: 'ember',
      name: { en: 'Ember', zh: '余烬' },
      colors: {
        light: {
          canvas: '#fff1f2',
          panel: 'rgba(255, 255, 255, 0.9)',
          surface: 'rgba(255, 241, 242, 0.85)',
          text: '#4c0519',
          blue: '#e11d48',
          createBackground: '#be123c',
          settingsChrome: '#fff5f6',
          settingsHover: '#fecdd3',
        },
        dark: {
          canvas: '#1a0a10',
          panel: 'rgba(40, 18, 28, 0.9)',
          surface: 'rgba(50, 22, 34, 0.88)',
          text: '#ffe4e6',
          blue: '#fb7185',
          createBackground: '#f43f5e',
          settingsChrome: '#16080e',
          settingsHover: '#4c0519',
        },
      },
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
      name: { en: 'Daylight', zh: '日光' },
      colors: {
        light: {
          canvas: '#faf9f8',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#242424',
          blue: '#0078d4',
          createBackground: '#0078d4',
          settingsChrome: '#ffffff',
          settingsHover: '#edebe9',
        },
        dark: {
          canvas: '#1f1f1f',
          panel: '#292929',
          surface: '#2d2d2d',
          text: '#ffffff',
          blue: '#60cdff',
          createBackground: '#60cdff',
          settingsChrome: '#202020',
          settingsHover: '#2c2c2c',
        },
      },
    },
    {
      id: 'moss',
      name: { en: 'Moss', zh: '苔绿' },
      colors: {
        light: {
          canvas: '#f3f7f0',
          panel: '#ffffff',
          surface: '#f8faf6',
          text: '#1b2e1c',
          blue: '#0f7b0f',
          createBackground: '#0f7b0f',
          settingsChrome: '#f6faf4',
          settingsHover: '#dff6dd',
        },
        dark: {
          canvas: '#141a14',
          panel: '#1f2a1f',
          surface: '#243024',
          text: '#e6f4e6',
          blue: '#6ccb5f',
          createBackground: '#6ccb5f',
          settingsChrome: '#171d17',
          settingsHover: '#1f3d1f',
        },
      },
    },
    {
      id: 'orchid',
      name: { en: 'Orchid', zh: '兰紫' },
      colors: {
        light: {
          canvas: '#f6f2fa',
          panel: '#ffffff',
          surface: '#faf7fc',
          text: '#2a1a36',
          blue: '#8764b8',
          createBackground: '#744da9',
          settingsChrome: '#f9f5fc',
          settingsHover: '#ede4f7',
        },
        dark: {
          canvas: '#17121f',
          panel: '#241c30',
          surface: '#2c223a',
          text: '#f3eef8',
          blue: '#b6a0ff',
          createBackground: '#b6a0ff',
          settingsChrome: '#1a1424',
          settingsHover: '#3a2a52',
        },
      },
    },
  ],
  material: [
    {
      id: 'default',
      name: { en: 'Studio', zh: 'Studio' },
      colors: { light: {}, dark: {} },
    },
    {
      id: 'baseline',
      name: { en: 'Baseline', zh: '基线蓝' },
      colors: {
        light: {
          canvas: '#f8f9fa',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#202124',
          blue: '#1a73e8',
          createBackground: '#1a73e8',
          settingsChrome: '#ffffff',
          settingsHover: '#e8f0fe',
        },
        dark: {
          canvas: '#131314',
          panel: '#1e1f20',
          surface: '#1e1f20',
          text: '#e3e3e3',
          blue: '#8ab4f8',
          createBackground: '#8ab4f8',
          settingsChrome: '#1e1f20',
          settingsHover: '#2a3441',
        },
      },
    },
    {
      id: 'tonal',
      name: { en: 'Tonal green', zh: '调性绿' },
      colors: {
        light: {
          canvas: '#f1f8f4',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1a1c1a',
          blue: '#0d904f',
          createBackground: '#0d904f',
          settingsChrome: '#ffffff',
          settingsHover: '#ceead6',
        },
        dark: {
          canvas: '#101412',
          panel: '#1a1f1c',
          surface: '#1a1f1c',
          text: '#e3e3e3',
          blue: '#81c995',
          createBackground: '#81c995',
          settingsChrome: '#1a1f1c',
          settingsHover: '#1e3b2a',
        },
      },
    },
    {
      id: 'dynamic',
      name: { en: 'Dynamic peach', zh: '动态桃' },
      colors: {
        light: {
          canvas: '#fff8f5',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#201a17',
          blue: '#c5221f',
          createBackground: '#c5221f',
          settingsChrome: '#ffffff',
          settingsHover: '#fce8e6',
        },
        dark: {
          canvas: '#1a1210',
          panel: '#211815',
          surface: '#211815',
          text: '#ece0db',
          blue: '#f28b82',
          createBackground: '#f28b82',
          settingsChrome: '#211815',
          settingsHover: '#4a2420',
        },
      },
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
      colors: {
        light: {
          canvas: '#ececf0',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1d1d1f',
          blue: '#5856d6',
          createBackground: '#5856d6',
          settingsChrome: '#f5f5f7',
          settingsHover: '#e8e8ed',
        },
        dark: {
          canvas: '#1c1c1e',
          panel: '#2c2c2e',
          surface: '#2c2c2e',
          text: '#f5f5f7',
          blue: '#5e5ce6',
          createBackground: '#5e5ce6',
          settingsChrome: '#1c1c1e',
          settingsHover: '#2c2c2e',
        },
      },
    },
    {
      id: 'teal',
      name: { en: 'Teal', zh: '青色' },
      colors: {
        light: {
          canvas: '#e8f1f1',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1d1d1f',
          blue: '#30b0c7',
          createBackground: '#30b0c7',
          settingsChrome: '#f2f7f7',
          settingsHover: '#d6f0f5',
        },
        dark: {
          canvas: '#0f1a1b',
          panel: '#1c2a2c',
          surface: '#1c2a2c',
          text: '#f5f5f7',
          blue: '#64d2ff',
          createBackground: '#64d2ff',
          settingsChrome: '#121c1e',
          settingsHover: '#1e3a40',
        },
      },
    },
    {
      id: 'pink',
      name: { en: 'Pink', zh: '粉色' },
      colors: {
        light: {
          canvas: '#f5eef1',
          panel: '#ffffff',
          surface: '#ffffff',
          text: '#1d1d1f',
          blue: '#ff2d55',
          createBackground: '#ff2d55',
          settingsChrome: '#faf4f6',
          settingsHover: '#ffe0e8',
        },
        dark: {
          canvas: '#1a1216',
          panel: '#2c1e24',
          surface: '#2c1e24',
          text: '#f5f5f7',
          blue: '#ff375f',
          createBackground: '#ff375f',
          settingsChrome: '#160e12',
          settingsHover: '#3d1c28',
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
