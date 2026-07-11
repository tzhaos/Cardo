import { useSyncExternalStore } from 'react';
import type { WorkspaceCommand } from '../../../core/contracts/workspaceCommands';
import type { InvalidationScope } from '../../../core/contracts/runtimeProtocol';
import type {
  Density,
  FontFamilyId,
  FontScale,
  WebSearchEngineId,
} from '../../../core/contracts/preferences';
import {
  DEFAULT_DENSITY,
  DEFAULT_FONT_FAMILY_ID,
  DEFAULT_FONT_SCALE,
} from '../../../core/contracts/preferences';
import type {
  FeatureFlagOverrides,
  FeatureId,
} from '../../../core/contracts/featureCatalog';
import {
  featureFlagOverridesSchema,
  withFeatureEnabled,
} from '../../../core/contracts/featureCatalog';
import {
  DEFAULT_LAYOUT_PROFILE_ID,
  layoutProfileIdSchema,
  type LayoutProfileId,
} from '../../../core/contracts/layoutProfile';
import { cssSnippetSchema } from '../../../core/contracts/cssSnippet';
import type {
  ImportedThemePacks,
  OverridableColorKey,
  ThemeColorOverrides,
  ThemeOptionValues,
  ThemePack,
} from '../../../core/contracts/themePack';
import {
  importedThemePacksSchema,
  themeColorOverridesSchema,
  themeOptionValuesSchema,
} from '../../../core/contracts/themePack';
import type { WebNextLocale } from '../../i18n/messages';
import {
  hasRegisteredThemePack,
  mergeUserThemePacks,
  OFFICIAL_DEFAULT_THEME_ID,
  syncImportedThemePacks,
  type WebNextColorMode,
} from '../../themes/themeRegistry';
import { importThemePackIntoRegistry } from '../../themes/themeIO';
import {
  dispatchDatabaseCommand,
  queryLocalThemePacks,
  queryPreferences,
} from '../../platform/hostPlatform';

interface PreferencesStore {
  colorMode: WebNextColorMode;
  locale: WebNextLocale;
  themeId: string;
  fontFamily: FontFamilyId;
  fontScale: FontScale;
  density: Density;
  themeColorOverrides: ThemeColorOverrides;
  themeOptionValues: ThemeOptionValues;
  importedThemePacks: ImportedThemePacks;
  featureFlags: FeatureFlagOverrides;
  layoutProfileId: LayoutProfileId;
  cssSnippet: string;
  cssSnippetEnabled: boolean;
  searchEngine: WebSearchEngineId;
  customSearchTemplate: string;
  initialize: () => Promise<void>;
  setColorMode: (colorMode: WebNextColorMode) => void;
  setLocale: (locale: WebNextLocale) => void;
  setThemeId: (themeId: string) => void;
  setFontFamily: (fontFamily: FontFamilyId) => void;
  setFontScale: (fontScale: FontScale) => void;
  setDensity: (density: Density) => void;
  setThemeColorOverride: (
    colorMode: WebNextColorMode,
    key: OverridableColorKey,
    value: string | null,
  ) => void;
  resetThemeColorOverrides: (themeId?: string) => void;
  setThemeOptionValue: (optionId: string, value: boolean | string) => void;
  resetThemeOptionValues: () => void;
  importThemePack: (pack: ThemePack) => void;
  removeImportedThemePack: (themeId: string) => void;
  setFeatureEnabled: (featureId: FeatureId, enabled: boolean) => void;
  resetFeatureFlags: () => void;
  setLayoutProfileId: (layoutProfileId: LayoutProfileId) => void;
  setCssSnippet: (cssSnippet: string) => void;
  setCssSnippetEnabled: (cssSnippetEnabled: boolean) => void;
  setSearchEngine: (searchEngine: WebSearchEngineId) => void;
  setCustomSearchTemplate: (customSearchTemplate: string) => void;
  toggleColorMode: () => void;
  toggleLocale: () => void;
}

const listeners = new Set<() => void>();
let preferenceQueue: Promise<unknown> = Promise.resolve();

const actions = {
  initialize: refreshPreferences,
  setColorMode: (colorMode: WebNextColorMode) =>
    fireCommand({ type: 'preferences.setColorMode', colorMode }),
  setLocale: (locale: WebNextLocale) => fireCommand({ type: 'preferences.setLocale', locale }),
  setThemeId: (themeId: string) => {
    if (hasRegisteredThemePack(themeId)) {
      fireCommand({ type: 'preferences.setTheme', themeId });
    }
  },
  setFontFamily: (fontFamily: FontFamilyId) =>
    fireCommand({ type: 'preferences.setFontFamily', fontFamily }),
  setFontScale: (fontScale: FontScale) =>
    fireCommand({ type: 'preferences.setFontScale', fontScale }),
  setDensity: (density: Density) => fireCommand({ type: 'preferences.setDensity', density }),
  setThemeColorOverride: (
    colorMode: WebNextColorMode,
    key: OverridableColorKey,
    value: string | null,
  ) => {
    const themeId = state.themeId;
    const next: ThemeColorOverrides = structuredClone(state.themeColorOverrides);
    const themeBucket = { ...(next[themeId] ?? {}) };
    const modeBucket = { ...(themeBucket[colorMode] ?? {}) };
    if (value == null || value.trim() === '') {
      delete modeBucket[key];
    } else {
      modeBucket[key] = value.trim();
    }
    if (Object.keys(modeBucket).length === 0) {
      delete themeBucket[colorMode];
    } else {
      themeBucket[colorMode] = modeBucket;
    }
    if (Object.keys(themeBucket).length === 0) {
      delete next[themeId];
    } else {
      next[themeId] = themeBucket;
    }
    fireCommand({
      type: 'preferences.setThemeColorOverrides',
      themeColorOverrides: themeColorOverridesSchema.parse(next),
    });
  },
  resetThemeColorOverrides: (themeId = state.themeId) => {
    const next: ThemeColorOverrides = { ...state.themeColorOverrides };
    delete next[themeId];
    fireCommand({
      type: 'preferences.setThemeColorOverrides',
      themeColorOverrides: themeColorOverridesSchema.parse(next),
    });
  },
  setThemeOptionValue: (optionId: string, value: boolean | string) => {
    const next: ThemeOptionValues = {
      ...state.themeOptionValues,
      [optionId]: value,
    };
    fireCommand({
      type: 'preferences.setThemeOptionValues',
      themeOptionValues: themeOptionValuesSchema.parse(next),
    });
  },
  resetThemeOptionValues: () => {
    fireCommand({
      type: 'preferences.setThemeOptionValues',
      themeOptionValues: {},
    });
  },
  importThemePack: (pack: ThemePack) => {
    const registered = importThemePackIntoRegistry(pack);
    const withoutSameId = state.importedThemePacks.filter((entry) => entry.id !== registered.id);
    const next = importedThemePacksSchema.parse([...withoutSameId, registered]);
    fireCommand({ type: 'preferences.setImportedThemePacks', importedThemePacks: next });
    fireCommand({ type: 'preferences.setTheme', themeId: registered.id });
  },
  removeImportedThemePack: (themeId: string) => {
    const next = importedThemePacksSchema.parse(
      state.importedThemePacks.filter((entry) => entry.id !== themeId),
    );
    fireCommand({ type: 'preferences.setImportedThemePacks', importedThemePacks: next });
    if (state.themeId === themeId) {
      fireCommand({ type: 'preferences.setTheme', themeId: OFFICIAL_DEFAULT_THEME_ID });
    }
  },
  setFeatureEnabled: (featureId: FeatureId, enabled: boolean) => {
    const next = featureFlagOverridesSchema.parse(
      withFeatureEnabled(state.featureFlags, featureId, enabled),
    );
    fireCommand({ type: 'preferences.setFeatureFlags', featureFlags: next });
  },
  resetFeatureFlags: () => {
    fireCommand({ type: 'preferences.setFeatureFlags', featureFlags: {} });
  },
  setLayoutProfileId: (layoutProfileId: LayoutProfileId) =>
    fireCommand({
      type: 'preferences.setLayoutProfile',
      layoutProfileId: layoutProfileIdSchema.parse(layoutProfileId),
    }),
  setCssSnippet: (cssSnippet: string) =>
    fireCommand({
      type: 'preferences.setCssSnippet',
      cssSnippet: cssSnippetSchema.parse(cssSnippet),
    }),
  setCssSnippetEnabled: (cssSnippetEnabled: boolean) =>
    fireCommand({ type: 'preferences.setCssSnippetEnabled', cssSnippetEnabled }),
  setSearchEngine: (searchEngine: WebSearchEngineId) =>
    fireCommand({ type: 'preferences.setSearchEngine', searchEngine }),
  setCustomSearchTemplate: (customSearchTemplate: string) =>
    fireCommand({ type: 'preferences.setCustomSearchTemplate', customSearchTemplate }),
  toggleColorMode: () => actions.setColorMode(state.colorMode === 'light' ? 'dark' : 'light'),
  toggleLocale: () => actions.setLocale(state.locale === 'en' ? 'zh' : 'en'),
} satisfies Omit<
  PreferencesStore,
  | 'colorMode'
  | 'locale'
  | 'themeId'
  | 'fontFamily'
  | 'fontScale'
  | 'density'
  | 'themeColorOverrides'
  | 'themeOptionValues'
  | 'importedThemePacks'
  | 'featureFlags'
  | 'layoutProfileId'
  | 'cssSnippet'
  | 'cssSnippetEnabled'
  | 'searchEngine'
  | 'customSearchTemplate'
>;

let state: PreferencesStore = {
  colorMode: 'light',
  locale: 'en',
  themeId: OFFICIAL_DEFAULT_THEME_ID,
  fontFamily: DEFAULT_FONT_FAMILY_ID,
  fontScale: DEFAULT_FONT_SCALE,
  density: DEFAULT_DENSITY,
  themeColorOverrides: {},
  themeOptionValues: {},
  importedThemePacks: [],
  featureFlags: {},
  layoutProfileId: DEFAULT_LAYOUT_PROFILE_ID,
  cssSnippet: '',
  cssSnippetEnabled: false,
  searchEngine: 'bing-cn',
  customSearchTemplate: '',
  ...actions,
};

async function refreshPreferences() {
  const preferences = await queryPreferences();
  if (!preferences) throw new Error('Cardo preferences are not initialized.');

  const importedThemePacks = importedThemePacksSchema.parse(preferences.importedThemePacks ?? []);
  const themeColorOverrides = themeColorOverridesSchema.parse(
    preferences.themeColorOverrides ?? {},
  );
  const themeOptionValues = themeOptionValuesSchema.parse(preferences.themeOptionValues ?? {});
  const featureFlags = featureFlagOverridesSchema.parse(preferences.featureFlags ?? {});
  const layoutProfileId = layoutProfileIdSchema.parse(
    preferences.layoutProfileId ?? DEFAULT_LAYOUT_PROFILE_ID,
  );
  const cssSnippet = cssSnippetSchema.parse(preferences.cssSnippet ?? '');
  const cssSnippetEnabled = Boolean(preferences.cssSnippetEnabled);

  // Disk themes from Runtime dataDir/themes (fail soft if query unavailable).
  let diskPacks: ThemePack[] = [];
  try {
    diskPacks = await queryLocalThemePacks();
  } catch {
    diskPacks = [];
  }

  // Official packs stay code-defined; rehydrate imports + local files.
  syncImportedThemePacks(mergeUserThemePacks(importedThemePacks, diskPacks));

  const themeId = hasRegisteredThemePack(preferences.themeId)
    ? preferences.themeId
    : OFFICIAL_DEFAULT_THEME_ID;

  state = {
    ...state,
    colorMode: preferences.colorMode,
    locale: preferences.locale,
    themeId,
    fontFamily: preferences.fontFamily,
    fontScale: preferences.fontScale,
    density: preferences.density,
    themeColorOverrides,
    themeOptionValues,
    importedThemePacks,
    featureFlags,
    layoutProfileId,
    cssSnippet,
    cssSnippetEnabled,
    searchEngine: preferences.searchEngine,
    customSearchTemplate: preferences.customSearchTemplate,
  };
  for (const listener of listeners) listener();
}

/**
 * Apply preferences scope from Runtime invalidation (design §6.9.2).
 * Refresh only when scopes include `preferences` (full catch-up always sends it).
 */
export async function applyPreferencesInvalidationScopes(
  scopes: InvalidationScope[],
): Promise<void> {
  if (!scopes.some((scope) => scope.type === 'preferences')) {
    return;
  }
  await refreshPreferences();
}

function fireCommand(command: WorkspaceCommand) {
  void enqueue(async () => {
    await dispatchDatabaseCommand(command);
  }).catch((error: unknown) => console.error('Failed to update preferences', error));
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = preferenceQueue.then(task, task);
  preferenceQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type PreferencesStoreHook = {
  <T>(selector: (current: PreferencesStore) => T): T;
  getState(): PreferencesStore;
  initialize(): Promise<void>;
};

export const usePreferencesStore = Object.assign(
  function usePreferencesSelector<T>(selector: (current: PreferencesStore) => T) {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state),
    );
  },
  {
    getState: () => state,
    initialize: refreshPreferences,
  },
) as PreferencesStoreHook;
