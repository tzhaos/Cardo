import { themePackSchema, type ColorTokenMap, type ThemePack } from '../../core/contracts/themePack';
import type { ColorMode } from '../../core/contracts/preferences';
import { applyTheme, type ApplyThemeOptions } from './applyTheme';
import { BUILT_IN_THEME_IDS, BUILT_IN_THEME_PACKS, OFFICIAL_DEFAULT_THEME_ID } from './builtInPacks';

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
  official: boolean;
}

const themeRegistry = new Map<string, ThemePack>();
const importedThemeIds = new Set<string>();

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
    official: BUILT_IN_THEME_IDS.has(pack.id),
  };
}

export function registerThemePack(pack: ThemePack) {
  const parsed = themePackSchema.parse(pack);
  if (BUILT_IN_THEME_IDS.has(parsed.id)) {
    throw new Error(`Official theme pack "${parsed.id}" is frozen and cannot be replaced.`);
  }
  themeRegistry.set(parsed.id, parsed);
  importedThemeIds.add(parsed.id);
}

/** Re-sync imported packs from preferences after load / invalidation. */
export function syncImportedThemePacks(packs: ThemePack[]) {
  for (const id of [...importedThemeIds]) {
    themeRegistry.delete(id);
    importedThemeIds.delete(id);
  }
  for (const pack of packs) {
    const parsed = themePackSchema.parse(pack);
    if (BUILT_IN_THEME_IDS.has(parsed.id)) continue;
    themeRegistry.set(parsed.id, parsed);
    importedThemeIds.add(parsed.id);
  }
}

export function unregisterImportedThemePack(themeId: string) {
  if (BUILT_IN_THEME_IDS.has(themeId)) {
    throw new Error(`Official theme pack "${themeId}" cannot be removed.`);
  }
  themeRegistry.delete(themeId);
  importedThemeIds.delete(themeId);
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
  return (
    themeRegistry.get(themeId) ??
    themeRegistry.get(OFFICIAL_DEFAULT_THEME_ID) ??
    BUILT_IN_THEME_PACKS[0]!
  );
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

export function isOfficialThemePack(themeId: string) {
  return BUILT_IN_THEME_IDS.has(themeId);
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

export { applyTheme, OFFICIAL_DEFAULT_THEME_ID };
export type { ApplyThemeOptions };
