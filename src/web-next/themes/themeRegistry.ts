import {
  themePackSchema,
  type ColorTokenMap,
  type ThemePack,
} from '../../core/contracts/themePack';
import type { ColorMode } from '../../core/contracts/preferences';
import { applyTheme, type ApplyThemeOptions } from './applyTheme';
import {
  BUILT_IN_THEME_IDS,
  BUILT_IN_THEME_PACKS,
  OFFICIAL_DEFAULT_THEME_ID,
} from './builtInPacks';

export type WebNextColorMode = ColorMode;

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
  const light = pack.tokens.colors.light;
  const dark = pack.tokens.colors.dark;
  if (!light || !dark) {
    throw new Error(`Theme pack "${pack.id}" is missing light/dark palettes.`);
  }
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description ?? pack.name,
    palettes: {
      light,
      dark,
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

/**
 * Re-sync non-built-in packs from preferences imports + Runtime disk themes.
 * Official packs load from themes/builtin JSON. Disk packs cannot overwrite official ids.
 */
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

/** Merge preference imports with file-scanned packs (imports win on id clash). */
export function mergeUserThemePacks(imported: ThemePack[], fromDisk: ThemePack[]): ThemePack[] {
  const byId = new Map<string, ThemePack>();
  for (const pack of fromDisk) {
    if (BUILT_IN_THEME_IDS.has(pack.id)) continue;
    byId.set(pack.id, pack);
  }
  for (const pack of imported) {
    if (BUILT_IN_THEME_IDS.has(pack.id)) continue;
    byId.set(pack.id, pack);
  }
  return [...byId.values()];
}

export function unregisterImportedThemePack(themeId: string) {
  if (BUILT_IN_THEME_IDS.has(themeId)) {
    throw new Error(`Official theme pack "${themeId}" cannot be removed.`);
  }
  themeRegistry.delete(themeId);
  importedThemeIds.delete(themeId);
}

export function getRegisteredThemePacks(): ThemePack[] {
  return [...themeRegistry.values()];
}

export function getRegisteredWebNextThemes(): WebNextThemeDefinition[] {
  return getRegisteredThemePacks().map(toDefinition);
}

export function getThemePack(themeId: string): ThemePack {
  const fallback = BUILT_IN_THEME_PACKS[0];
  if (!fallback) {
    throw new Error('No built-in theme packs are registered.');
  }
  return themeRegistry.get(themeId) ?? themeRegistry.get(OFFICIAL_DEFAULT_THEME_ID) ?? fallback;
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

export { applyTheme, OFFICIAL_DEFAULT_THEME_ID };
export type { ApplyThemeOptions };
