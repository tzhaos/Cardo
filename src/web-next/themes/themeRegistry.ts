import type { WebNextLocale } from '../i18n/messages';

export type WebNextColorMode = 'light' | 'dark';

export interface WebNextThemePalette {
  canvas: string;
  surface: string;
  surfaceStrong: string;
  panel: string;
  panelBottom: string;
  panelContent: string;
  panelChrome: string;
  border: string;
  borderSubtle: string;
  divider: string;
  text: string;
  softText: string;
  secondaryText: string;
  muted: string;
  hover: string;
  active: string;
  input: string;
  itemHover: string;
  glyph: string;
  neutralButton: string;
  neutralButtonHover: string;
  createBackground: string;
  createText: string;
  scrollbar: string;
  scrollbarHover: string;
  shadow: string;
  shadowHover: string;
  insetShadow: string;
  selectionRing: string;
}

export interface WebNextThemeDefinition {
  id: string;
  name: Record<WebNextLocale, string>;
  description: Record<WebNextLocale, string>;
  palettes: Record<WebNextColorMode, WebNextThemePalette>;
}

const classicLight: WebNextThemePalette = {
  canvas: '#f0f0f2',
  surface: 'rgba(255, 255, 255, 0.82)',
  surfaceStrong: 'rgba(255, 255, 255, 0.94)',
  panel: '#ffffff',
  panelBottom: '#f7f7f8',
  panelContent: 'rgba(255, 255, 255, 0.52)',
  panelChrome: 'rgba(255, 255, 255, 0.42)',
  border: 'rgba(0, 0, 0, 0.05)',
  borderSubtle: '#f3f4f6',
  divider: 'rgba(229, 231, 235, 0.95)',
  text: '#111827',
  softText: '#374151',
  secondaryText: '#6b7280',
  muted: '#9ca3af',
  hover: 'rgba(0, 0, 0, 0.05)',
  active: 'rgba(0, 0, 0, 0.05)',
  input: '#ffffff',
  itemHover: '#ffffff',
  glyph: '#f9fafb',
  neutralButton: '#e5e7eb',
  neutralButtonHover: '#d1d5db',
  createBackground: '#111827',
  createText: '#ffffff',
  scrollbar: 'rgba(0, 0, 0, 0.15)',
  scrollbarHover: 'rgba(0, 0, 0, 0.25)',
  shadow:
    '0 1px 1px rgba(0,0,0,.02), 0 2px 2px rgba(0,0,0,.02), 0 4px 4px rgba(0,0,0,.02), 0 8px 8px rgba(0,0,0,.02), 0 16px 16px rgba(0,0,0,.02)',
  shadowHover:
    '0 2px 2px rgba(0,0,0,.03), 0 4px 4px rgba(0,0,0,.03), 0 8px 8px rgba(0,0,0,.03), 0 16px 16px rgba(0,0,0,.03), 0 32px 32px rgba(0,0,0,.03), 0 64px 64px rgba(0,0,0,.03)',
  insetShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
  selectionRing: 'rgba(59, 130, 246, 0.18)',
};

const classicDark: WebNextThemePalette = {
  canvas: '#1a1a1b',
  surface: 'rgba(42, 42, 43, 0.86)',
  surfaceStrong: 'rgba(42, 42, 43, 0.96)',
  panel: '#2a2a2b',
  panelBottom: '#222223',
  panelContent: 'rgba(0, 0, 0, 0.2)',
  panelChrome: 'rgba(0, 0, 0, 0.18)',
  border: 'rgba(255, 255, 255, 0.06)',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',
  divider: 'rgba(255, 255, 255, 0.1)',
  text: '#f3f4f6',
  softText: '#d1d5db',
  secondaryText: '#9ca3af',
  muted: '#6b7280',
  hover: 'rgba(255, 255, 255, 0.06)',
  active: 'rgba(255, 255, 255, 0.1)',
  input: '#202021',
  itemHover: '#303032',
  glyph: '#242426',
  neutralButton: '#3f3f42',
  neutralButtonHover: '#4b4b4f',
  createBackground: '#f3f4f6',
  createText: '#171719',
  scrollbar: 'rgba(255, 255, 255, 0.15)',
  scrollbarHover: 'rgba(255, 255, 255, 0.25)',
  shadow:
    '0 1px 1px rgba(0,0,0,.1), 0 2px 2px rgba(0,0,0,.1), 0 4px 4px rgba(0,0,0,.1), 0 8px 8px rgba(0,0,0,.1), 0 16px 16px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.05)',
  shadowHover:
    '0 2px 2px rgba(0,0,0,.15), 0 4px 4px rgba(0,0,0,.15), 0 8px 8px rgba(0,0,0,.15), 0 16px 16px rgba(0,0,0,.15), 0 32px 32px rgba(0,0,0,.15), 0 64px 64px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.05)',
  insetShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.28)',
  selectionRing: 'rgba(96, 165, 250, 0.34)',
};

const oceanLight: WebNextThemePalette = {
  ...classicLight,
  canvas: '#edf4f8',
  surface: 'rgba(248, 252, 255, 0.86)',
  surfaceStrong: 'rgba(252, 254, 255, 0.96)',
  panel: '#fbfdff',
  panelBottom: '#eef6fb',
  panelContent: 'rgba(248, 252, 255, 0.62)',
  panelChrome: 'rgba(250, 253, 255, 0.52)',
  border: 'rgba(14, 116, 144, 0.1)',
  borderSubtle: 'rgba(14, 116, 144, 0.09)',
  divider: 'rgba(100, 116, 139, 0.2)',
  text: '#10202c',
  softText: '#2f4858',
  secondaryText: '#607888',
  muted: '#8da0ac',
  hover: 'rgba(14, 116, 144, 0.07)',
  active: 'rgba(14, 165, 233, 0.1)',
  input: '#ffffff',
  itemHover: '#ffffff',
  glyph: '#f1f8fb',
  neutralButton: '#dbe8ee',
  neutralButtonHover: '#cbdde6',
  createBackground: '#153847',
  shadow:
    '0 1px 1px rgba(15,56,71,.025), 0 2px 3px rgba(15,56,71,.025), 0 6px 10px rgba(15,56,71,.035), 0 16px 28px rgba(15,56,71,.045)',
  shadowHover:
    '0 2px 3px rgba(15,56,71,.035), 0 8px 16px rgba(15,56,71,.05), 0 24px 46px rgba(15,56,71,.07)',
};

const oceanDark: WebNextThemePalette = {
  ...classicDark,
  canvas: '#0f171d',
  surface: 'rgba(24, 39, 49, 0.88)',
  surfaceStrong: 'rgba(27, 43, 53, 0.97)',
  panel: '#1b2b35',
  panelBottom: '#14232c',
  panelContent: 'rgba(8, 18, 24, 0.34)',
  panelChrome: 'rgba(8, 18, 24, 0.28)',
  border: 'rgba(125, 211, 252, 0.09)',
  borderSubtle: 'rgba(125, 211, 252, 0.08)',
  divider: 'rgba(186, 230, 253, 0.12)',
  text: '#e8f4fa',
  softText: '#c5dbe6',
  secondaryText: '#91acba',
  muted: '#627e8b',
  hover: 'rgba(125, 211, 252, 0.07)',
  active: 'rgba(56, 189, 248, 0.12)',
  input: '#111f27',
  itemHover: '#20343f',
  glyph: '#172832',
  neutralButton: '#2c4552',
  neutralButtonHover: '#365563',
  createBackground: '#e0f2fe',
  createText: '#0f2530',
};

const orchidLight: WebNextThemePalette = {
  ...classicLight,
  canvas: '#f4f1f7',
  surface: 'rgba(255, 252, 255, 0.86)',
  surfaceStrong: 'rgba(255, 253, 255, 0.96)',
  panel: '#fffdfd',
  panelBottom: '#f7f1f8',
  panelContent: 'rgba(255, 252, 255, 0.58)',
  panelChrome: 'rgba(255, 252, 255, 0.5)',
  border: 'rgba(101, 61, 117, 0.09)',
  borderSubtle: 'rgba(101, 61, 117, 0.08)',
  divider: 'rgba(107, 78, 120, 0.18)',
  text: '#251d29',
  softText: '#4d3f53',
  secondaryText: '#75667b',
  muted: '#a092a5',
  hover: 'rgba(101, 61, 117, 0.065)',
  active: 'rgba(126, 87, 194, 0.09)',
  input: '#ffffff',
  itemHover: '#ffffff',
  glyph: '#faf6fb',
  neutralButton: '#e9e0eb',
  neutralButtonHover: '#ddd0e0',
  createBackground: '#332738',
  shadow:
    '0 1px 1px rgba(51,39,56,.02), 0 2px 3px rgba(51,39,56,.025), 0 7px 12px rgba(51,39,56,.03), 0 18px 32px rgba(51,39,56,.045)',
  shadowHover:
    '0 2px 3px rgba(51,39,56,.03), 0 9px 18px rgba(51,39,56,.045), 0 28px 52px rgba(51,39,56,.065)',
};

const orchidDark: WebNextThemePalette = {
  ...classicDark,
  canvas: '#17141b',
  surface: 'rgba(42, 35, 47, 0.88)',
  surfaceStrong: 'rgba(46, 38, 52, 0.97)',
  panel: '#2d2632',
  panelBottom: '#241e29',
  panelContent: 'rgba(13, 9, 16, 0.32)',
  panelChrome: 'rgba(13, 9, 16, 0.25)',
  border: 'rgba(233, 213, 255, 0.08)',
  borderSubtle: 'rgba(233, 213, 255, 0.07)',
  divider: 'rgba(233, 213, 255, 0.11)',
  text: '#f5eef7',
  softText: '#ded0e2',
  secondaryText: '#ad9ab3',
  muted: '#76677c',
  hover: 'rgba(233, 213, 255, 0.065)',
  active: 'rgba(196, 181, 253, 0.11)',
  input: '#201a24',
  itemHover: '#382f3e',
  glyph: '#271f2c',
  neutralButton: '#493d50',
  neutralButtonHover: '#57475f',
  createBackground: '#f3e8ff',
  createText: '#281d2d',
};

export const WEB_NEXT_BUILT_IN_THEMES: WebNextThemeDefinition[] = [
  {
    id: 'classic',
    name: { en: 'Classic', zh: '经典' },
    description: { en: 'The neutral prototype palette.', zh: '与原型一致的中性色调。' },
    palettes: { light: classicLight, dark: classicDark },
  },
  {
    id: 'ocean',
    name: { en: 'Ocean', zh: '海洋' },
    description: { en: 'Cool blue-gray surfaces.', zh: '冷静的蓝灰色表面。' },
    palettes: { light: oceanLight, dark: oceanDark },
  },
  {
    id: 'orchid',
    name: { en: 'Orchid', zh: '兰紫' },
    description: { en: 'A quiet violet-tinted palette.', zh: '克制的紫罗兰色调。' },
    palettes: { light: orchidLight, dark: orchidDark },
  },
];

const themeRegistry = new Map(WEB_NEXT_BUILT_IN_THEMES.map((theme) => [theme.id, theme] as const));

const cssVariableNames: Record<keyof WebNextThemePalette, string> = {
  canvas: '--wbn-canvas',
  surface: '--wbn-surface',
  surfaceStrong: '--wbn-surface-strong',
  panel: '--wbn-panel',
  panelBottom: '--wbn-panel-bottom',
  panelContent: '--wbn-panel-content',
  panelChrome: '--wbn-panel-chrome',
  border: '--wbn-border',
  borderSubtle: '--wbn-border-subtle',
  divider: '--wbn-divider',
  text: '--wbn-text',
  softText: '--wbn-soft-text',
  secondaryText: '--wbn-secondary-text',
  muted: '--wbn-muted',
  hover: '--wbn-hover',
  active: '--wbn-active',
  input: '--wbn-input',
  itemHover: '--wbn-item-hover',
  glyph: '--wbn-glyph',
  neutralButton: '--wbn-neutral-button',
  neutralButtonHover: '--wbn-neutral-button-hover',
  createBackground: '--wbn-create-background',
  createText: '--wbn-create-text',
  scrollbar: '--wbn-scrollbar',
  scrollbarHover: '--wbn-scrollbar-hover',
  shadow: '--wbn-shadow',
  shadowHover: '--wbn-shadow-hover',
  insetShadow: '--wbn-inset-shadow',
  selectionRing: '--wbn-selection-ring',
};

export function registerWebNextTheme(theme: WebNextThemeDefinition) {
  if (!theme.id.trim() || !theme.palettes.light || !theme.palettes.dark) {
    throw new Error('A web-next theme must define an id plus light and dark palettes.');
  }
  themeRegistry.set(theme.id, theme);
}

export function getRegisteredWebNextThemes() {
  return [...themeRegistry.values()];
}

export function getWebNextTheme(themeId: string) {
  return themeRegistry.get(themeId) ?? WEB_NEXT_BUILT_IN_THEMES[0];
}

export function isRegisteredWebNextTheme(themeId: unknown): themeId is string {
  return typeof themeId === 'string' && themeRegistry.has(themeId);
}

export function applyWebNextTheme(root: HTMLElement, themeId: string, colorMode: WebNextColorMode) {
  const theme = getWebNextTheme(themeId);
  const palette = theme.palettes[colorMode];

  root.dataset.theme = theme.id;
  root.dataset.colorMode = colorMode;
  root.classList.toggle('dark', colorMode === 'dark');
  root.style.colorScheme = colorMode;

  for (const [token, value] of Object.entries(palette) as Array<
    [keyof WebNextThemePalette, string]
  >) {
    root.style.setProperty(cssVariableNames[token], value);
  }
}
