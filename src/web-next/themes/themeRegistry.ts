import { themePackSchema, type ColorTokenMap, type ThemePack } from '../../core/contracts/themePack';
import type { ColorMode } from '../../core/contracts/preferences';
import { applyTheme, type ApplyThemeOptions } from './applyTheme';
import { BUILT_IN_THEME_PACKS } from './builtInPacks';

export type WebNextColorMode = ColorMode;

/** @deprecated Use ColorTokenMap from themePack; kept for Settings preview typing. */
export type WebNextThemePalette = ColorTokenMap;

/**
 * Presentation view of a registered pack used by Settings theme cards.
 * Prefer ThemePack for new code.
 */
export interface WebNextThemeDefinition {
  id: string;
  name: ThemePack['name'];
  description: NonNullable<ThemePack['description']>;
  palettes: Record<WebNextColorMode, ColorTokenMap>;
  pack: ThemePack;
}

const themeRegistry = new Map<string, ThemePack>();

for (const pack of BUILT_IN_THEME_PACKS) {
  themeRegistry.set(pack.id, themePackSchema.parse(pack));
}

function toDefinition(pack: ThemePack): WebNextThemeDefinition {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description ?? pack.name,
    palettes: {
      light: pack.tokens.colors.light!,
      dark: pack.tokens.colors.dark!,
    },
    pack,
  };
}

export function registerThemePack(pack: ThemePack) {
  const parsed = themePackSchema.parse(pack);
  themeRegistry.set(parsed.id, parsed);
}

/** @deprecated Use registerThemePack */
export function registerWebNextTheme(theme: WebNextThemeDefinition) {
  registerThemePack(theme.pack);
}

export function getRegisteredThemePacks(): ThemePack[] {
  return [...themeRegistry.values()];
}

export function getRegisteredWebNextThemes(): WebNextThemeDefinition[] {
  return getRegisteredThemePacks().map(toDefinition);
}

export function getThemePack(themeId: string): ThemePack {
  return themeRegistry.get(themeId) ?? BUILT_IN_THEME_PACKS[0]!;
}

export function getWebNextTheme(themeId: string): WebNextThemeDefinition {
  return toDefinition(getThemePack(themeId));
}

export function hasRegisteredWebNextTheme(themeId: string) {
  return themeRegistry.has(themeId);
}

export function hasRegisteredThemePack(themeId: string) {
  return themeRegistry.has(themeId);
}

/**
 * Apply theme + typography preferences to the document root.
 * Prefer passing full ApplyThemeOptions from preferences store.
 */
export function applyWebNextTheme(
  root: HTMLElement,
  themeId: string,
  colorMode: WebNextColorMode,
  options?: Omit<ApplyThemeOptions, 'themeId' | 'colorMode'>,
) {
  return applyTheme(root, {
    themeId,
    colorMode,
    ...options,
  });
}

export { applyTheme };
export type { ApplyThemeOptions };
