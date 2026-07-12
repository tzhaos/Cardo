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
  normalizeFeatureFlagOverrides,
  withFeatureEnabled,
} from '../../../core/contracts/featureCatalog';
import {
  DEFAULT_LAYOUT_PROFILE_ID,
  layoutProfileIdSchema,
  normalizeLayoutProfileId,
  type LayoutProfileId,
} from '../../../core/contracts/layoutProfile';
import { cssSnippetSchema } from '../../../core/contracts/cssSnippet';
import type {
  ImportedThemePacks,
  OverridableColorKey,
  OverridableColorMap,
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
  applyWebNextTheme,
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
  /**
   * Apply a designed light+dark color look for a theme pack.
   * Pass empty maps to clear overrides (pack defaults).
   * Patches themeColorOverrides optimistically so CSS vars update immediately.
   */
  applyThemeColorLook: (
    themeId: string,
    colors: { light: OverridableColorMap; dark: OverridableColorMap },
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
  /** Restore official Cardo defaults for theme, layout, chrome features, and typography. */
  restoreOfficialLook: () => void;
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
    const themeId = state.themeId || OFFICIAL_DEFAULT_THEME_ID;
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
    commitThemeColorOverrides(next);
  },
  /**
   * Apply a designed light+dark color look for a theme pack.
   * Pass empty maps to clear overrides (pack defaults).
   * Optimistically patches local state so CSS vars update before Runtime ack.
   */
  applyThemeColorLook: (themeId, colors) => {
    const next: ThemeColorOverrides = structuredClone(state.themeColorOverrides);
    const lightEmpty = Object.keys(colors.light).length === 0;
    const darkEmpty = Object.keys(colors.dark).length === 0;
    if (lightEmpty && darkEmpty) {
      delete next[themeId];
    } else {
      // Replace this theme's bucket entirely so look switches are absolute, not merged.
      next[themeId] = {
        ...(lightEmpty ? {} : { light: { ...colors.light } }),
        ...(darkEmpty ? {} : { dark: { ...colors.dark } }),
      };
    }
    commitThemeColorOverrides(next);
  },
  resetThemeColorOverrides: (themeId = state.themeId || OFFICIAL_DEFAULT_THEME_ID) => {
    const next: ThemeColorOverrides = structuredClone(state.themeColorOverrides);
    delete next[themeId];
    commitThemeColorOverrides(next);
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
  restoreOfficialLook: () => {
    fireCommand({ type: 'preferences.setTheme', themeId: OFFICIAL_DEFAULT_THEME_ID });
    fireCommand({
      type: 'preferences.setLayoutProfile',
      layoutProfileId: DEFAULT_LAYOUT_PROFILE_ID,
    });
    fireCommand({ type: 'preferences.setFontFamily', fontFamily: DEFAULT_FONT_FAMILY_ID });
    fireCommand({ type: 'preferences.setFontScale', fontScale: DEFAULT_FONT_SCALE });
    fireCommand({ type: 'preferences.setDensity', density: DEFAULT_DENSITY });
    commitThemeColorOverrides({});
    fireCommand({ type: 'preferences.setThemeOptionValues', themeOptionValues: {} });
    fireCommand({ type: 'preferences.setFeatureFlags', featureFlags: {} });
    fireCommand({ type: 'preferences.setCssSnippetEnabled', cssSnippetEnabled: false });
    fireCommand({ type: 'preferences.setCssSnippet', cssSnippet: '' });
  },
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

function emitChange() {
  for (const listener of listeners) listener();
}

function patchPreferences(
  patch: Partial<
    Pick<
      PreferencesStore,
      | 'colorMode'
      | 'locale'
      | 'themeId'
      | 'searchEngine'
      | 'customSearchTemplate'
      | 'themeColorOverrides'
      | 'fontFamily'
      | 'fontScale'
      | 'density'
      | 'featureFlags'
      | 'layoutProfileId'
      | 'themeOptionValues'
    >
  >,
) {
  state = { ...state, ...patch };
  emitChange();
}

async function refreshPreferences() {
  const preferences = await queryPreferences();
  if (!preferences) throw new Error('Cardo preferences are not initialized.');

  const importedThemePacks = importedThemePacksSchema.parse(preferences.importedThemePacks ?? []);
  const themeColorOverrides = themeColorOverridesSchema.parse(
    preferences.themeColorOverrides ?? {},
  );
  const themeOptionValues = themeOptionValuesSchema.parse(preferences.themeOptionValues ?? {});
  // Drop retired flag keys (e.g. item.contextMenu) without failing the whole hydrate.
  const featureFlags = normalizeFeatureFlagOverrides(preferences.featureFlags ?? {});
  const layoutProfileId = normalizeLayoutProfileId(preferences.layoutProfileId);
  const cssSnippet = cssSnippetSchema.parse(preferences.cssSnippet ?? '');
  const cssSnippetEnabled = Boolean(preferences.cssSnippetEnabled);

  // Disk themes from Runtime dataDir/themes (fail soft if query unavailable).
  let diskPacks: ThemePack[] = [];
  try {
    diskPacks = await queryLocalThemePacks();
  } catch {
    diskPacks = [];
  }

  // Official packs stay code-defined; rehydrate imports + local files (cannot replace official ids).
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
  emitChange();
}

/**
 * Apply preferences scope from Runtime invalidation (design §6.9.2).
 * Refresh when scopes include `preferences` (narrow prefs mutation or full catch-up).
 */
export async function applyPreferencesInvalidationScopes(
  scopes: InvalidationScope[],
): Promise<void> {
  if (!scopes.some((scope) => scope.type === 'preferences')) {
    return;
  }
  await refreshPreferences();
}

/**
 * Validate + fire theme color overrides. Always goes through fireCommand so
 * applyOptimisticCommand patches themeColorOverrides before Runtime ack
 * (looks, single-token edits, and restore paths share this).
 * Also writes CSS vars on document immediately — look clicks must paint before
 * the next React layout effect (and even if Runtime ack is slow).
 */
function commitThemeColorOverrides(next: ThemeColorOverrides) {
  const parsed = themeColorOverridesSchema.parse(next);
  fireCommand({
    type: 'preferences.setThemeColorOverrides',
    themeColorOverrides: parsed,
  });
  paintDocumentTheme(parsed);
}

/** Synchronous CSS-var write from current prefs + optional override snapshot. */
function paintDocumentTheme(colorOverrides?: ThemeColorOverrides) {
  if (typeof document === 'undefined') return;
  applyWebNextTheme(document.documentElement, state.themeId, state.colorMode, {
    fontFamily: state.fontFamily,
    fontScale: state.fontScale,
    density: state.density,
    colorOverrides: colorOverrides ?? state.themeColorOverrides,
    optionValues: state.themeOptionValues,
  });
}

/**
 * Optimistic local patch so initiator UI (controlled toggles/inputs) updates
 * immediately. Runtime command.ok / SSE scopes re-query and reconcile.
 */
function applyOptimisticCommand(command: WorkspaceCommand) {
  switch (command.type) {
    case 'preferences.setColorMode':
      patchPreferences({ colorMode: command.colorMode });
      break;
    case 'preferences.setLocale':
      patchPreferences({ locale: command.locale });
      break;
    case 'preferences.setTheme':
      patchPreferences({ themeId: command.themeId });
      break;
    case 'preferences.setSearchEngine':
      patchPreferences({ searchEngine: command.searchEngine });
      break;
    case 'preferences.setCustomSearchTemplate':
      patchPreferences({ customSearchTemplate: command.customSearchTemplate });
      break;
    case 'preferences.setThemeColorOverrides':
      // New object reference so WebNextApp re-applies CSS vars synchronously.
      patchPreferences({
        themeColorOverrides: structuredClone(command.themeColorOverrides),
      });
      break;
    case 'preferences.setFontFamily':
      patchPreferences({ fontFamily: command.fontFamily });
      break;
    case 'preferences.setFontScale':
      patchPreferences({ fontScale: command.fontScale });
      break;
    case 'preferences.setDensity':
      patchPreferences({ density: command.density });
      break;
    case 'preferences.setFeatureFlags':
      patchPreferences({ featureFlags: command.featureFlags });
      break;
    case 'preferences.setLayoutProfile':
      patchPreferences({ layoutProfileId: command.layoutProfileId });
      break;
    case 'preferences.setThemeOptionValues':
      patchPreferences({ themeOptionValues: command.themeOptionValues });
      break;
    default:
      break;
  }
}

function fireCommand(command: WorkspaceCommand) {
  applyOptimisticCommand(command);
  void enqueue(async () => {
    // Scopes (including preferences) applied from command.ok via RuntimeClient
    // → applyRuntimeScopes → applyPreferencesInvalidationScopes.
    await dispatchDatabaseCommand(command);
  }).catch((error: unknown) => {
    console.error('Failed to update preferences', error);
    // Roll back optimistic patch from authoritative Runtime state.
    void refreshPreferences().catch((refreshError: unknown) =>
      console.error('Failed to refresh preferences after command error', refreshError),
    );
  });
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
