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
import type { FeatureFlagOverrides, FeatureId } from '../../../core/contracts/featureCatalog';
import {
  featureFlagOverridesSchema,
  normalizeFeatureFlagOverrides,
  withFeatureEnabled,
} from '../../../core/contracts/featureCatalog';
import {
  DEFAULT_LAYOUT_PROFILE_ID,
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
  ensureThemePackShellColors,
  importedThemePacksSchema,
  themeColorOverridesSchema,
  themeOptionValuesSchema,
  themePackSchema,
} from '../../../core/contracts/themePack';
import { translateWebNext, type WebNextLocale } from '../../i18n/messages';
import {
  applyWebNextTheme,
  hasRegisteredThemePack,
  mergeUserThemePacks,
  OFFICIAL_DEFAULT_THEME_ID,
  syncImportedThemePacks,
  type WebNextColorMode,
} from '../../themes/themeRegistry';
import {
  importThemePackIntoRegistry,
  removeImportedThemePack as unregisterImportedThemePack,
} from '../../themes/themeIO';
import {
  dispatchDatabaseCommand,
  queryLocalThemePacks,
  queryPreferences,
} from '../../platform/hostPlatform';
import { applyLayoutProfile } from '../../shell/layouts/applyLayoutProfile';
import { showToast } from './toastStore';

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
  /** Product forbids custom theme colors — no-op. */
  setThemeColorOverride: () => undefined,
  applyThemeColorLook: () => undefined,
  resetThemeColorOverrides: () => {
    fireCommand({ type: 'preferences.setThemeColorOverrides', themeColorOverrides: {} });
  },
  setThemeOptionValue: () => undefined,
  resetThemeOptionValues: () => {
    fireCommand({ type: 'preferences.setThemeOptionValues', themeOptionValues: {} });
  },
  /** Product forbids custom theme packs — no-op. */
  importThemePack: () => undefined,
  removeImportedThemePack: (themeId: string) => {
    unregisterImportedThemePack(themeId);
    fireCommand({ type: 'preferences.setImportedThemePacks', importedThemePacks: [] });
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
  setLayoutProfileId: (_layoutProfileId: LayoutProfileId) => {
    // Layout is product-fixed to classic; ignore alternate values.
    const next = DEFAULT_LAYOUT_PROFILE_ID;
    patchPreferences({ layoutProfileId: next });
    if (typeof document !== 'undefined') {
      applyLayoutProfile(document.documentElement, next);
    }
    fireCommand({
      type: 'preferences.setLayoutProfile',
      layoutProfileId: next,
    });
  },
  /** Product forbids custom CSS — no-op (App never applies snippets). */
  setCssSnippet: () => undefined,
  setCssSnippetEnabled: () => undefined,
  restoreOfficialLook: () => {
    fireCommand({ type: 'preferences.setTheme', themeId: OFFICIAL_DEFAULT_THEME_ID });
    fireCommand({
      type: 'preferences.setLayoutProfile',
      layoutProfileId: DEFAULT_LAYOUT_PROFILE_ID,
    });
    fireCommand({ type: 'preferences.setFontFamily', fontFamily: DEFAULT_FONT_FAMILY_ID });
    fireCommand({ type: 'preferences.setFontScale', fontScale: DEFAULT_FONT_SCALE });
    fireCommand({ type: 'preferences.setDensity', density: DEFAULT_DENSITY });
    fireCommand({ type: 'preferences.setThemeColorOverrides', themeColorOverrides: {} });
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
      | 'importedThemePacks'
      | 'cssSnippet'
      | 'cssSnippetEnabled'
    >
  >,
) {
  state = { ...state, ...patch };
  emitChange();
}

/**
 * Load imported packs with one-way shell fill then strict parse per entry.
 * Drop irreparable packs so one bad import cannot brick preferences hydrate.
 */
function loadImportedThemePacks(raw: unknown): {
  packs: ImportedThemePacks;
  repaired: boolean;
  droppedIds: string[];
} {
  if (!Array.isArray(raw)) {
    return { packs: [], repaired: false, droppedIds: [] };
  }

  const packs: ThemePack[] = [];
  const droppedIds: string[] = [];
  let repaired = false;

  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') {
      console.warn('[cardo] Dropped imported theme pack: not an object.');
      continue;
    }
    let clone: unknown;
    try {
      clone = structuredClone(entry);
    } catch {
      try {
        clone = JSON.parse(JSON.stringify(entry)) as unknown;
      } catch {
        console.warn('[cardo] Dropped imported theme pack: could not clone.');
        continue;
      }
    }
    const beforeShell = JSON.stringify(clone);
    ensureThemePackShellColors(clone as Parameters<typeof ensureThemePackShellColors>[0]);
    if (JSON.stringify(clone) !== beforeShell) {
      repaired = true;
    }
    const parsed = themePackSchema.safeParse(clone);
    if (!parsed.success) {
      const id =
        typeof (entry as { id?: unknown }).id === 'string'
          ? (entry as { id: string }).id
          : '(unknown)';
      droppedIds.push(id);
      console.warn(
        `[cardo] Dropped imported theme pack "${id}" after shell fill: validation failed.`,
      );
      continue;
    }
    packs.push(parsed.data);
  }

  const limited = packs.slice(0, 24);
  return {
    packs: importedThemePacksSchema.parse(limited),
    repaired: repaired || packs.length !== limited.length,
    droppedIds,
  };
}

async function refreshPreferences() {
  const preferences = await queryPreferences();
  if (!preferences) throw new Error('Cardo preferences are not initialized.');

  const {
    packs: importedThemePacks,
    repaired: importedRepaired,
    droppedIds: droppedImportIds,
  } = loadImportedThemePacks(preferences.importedThemePacks ?? []);
  const themeColorOverrides = themeColorOverridesSchema.parse(
    preferences.themeColorOverrides ?? {},
  );
  const themeOptionValues = themeOptionValuesSchema.parse(preferences.themeOptionValues ?? {});
  // Drop retired flag keys (e.g. item.contextMenu) without failing the whole hydrate.
  const featureFlags = normalizeFeatureFlagOverrides(preferences.featureFlags ?? {});
  const layoutProfileId = DEFAULT_LAYOUT_PROFILE_ID;
  const cssSnippet = cssSnippetSchema.parse(preferences.cssSnippet ?? '');
  const cssSnippetEnabled = Boolean(preferences.cssSnippetEnabled);
  // One-way repair: older rows may still say floating/zen; force classic in DB.
  if (preferences.layoutProfileId !== DEFAULT_LAYOUT_PROFILE_ID) {
    fireCommand({
      type: 'preferences.setLayoutProfile',
      layoutProfileId: DEFAULT_LAYOUT_PROFILE_ID,
    });
  }

  // Persist repaired imports so next boot is already new-shape (shell filled).
  if (importedRepaired || droppedImportIds.length > 0) {
    fireCommand({
      type: 'preferences.setImportedThemePacks',
      importedThemePacks,
    });
  }

  // Disk themes from Runtime dataDir/themes (fail soft if query unavailable).
  let diskPacks: ThemePack[] = [];
  try {
    diskPacks = await queryLocalThemePacks();
  } catch {
    diskPacks = [];
  }

  // Official packs stay code-defined; rehydrate imports + local files (cannot replace official ids).
  syncImportedThemePacks(mergeUserThemePacks(importedThemePacks, diskPacks));

  let themeId = hasRegisteredThemePack(preferences.themeId)
    ? preferences.themeId
    : OFFICIAL_DEFAULT_THEME_ID;
  // If active theme was a dropped import, fall back to classic.
  if (droppedImportIds.includes(preferences.themeId) || !hasRegisteredThemePack(themeId)) {
    themeId = OFFICIAL_DEFAULT_THEME_ID;
    if (preferences.themeId !== OFFICIAL_DEFAULT_THEME_ID) {
      fireCommand({ type: 'preferences.setTheme', themeId: OFFICIAL_DEFAULT_THEME_ID });
    }
  }

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
      // New object reference so CardoApp re-applies CSS vars synchronously.
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
      patchPreferences({ layoutProfileId: DEFAULT_LAYOUT_PROFILE_ID });
      break;
    case 'preferences.setThemeOptionValues':
      patchPreferences({ themeOptionValues: command.themeOptionValues });
      break;
    case 'preferences.setImportedThemePacks':
      patchPreferences({
        importedThemePacks: structuredClone(command.importedThemePacks),
      });
      break;
    case 'preferences.setCssSnippet':
      patchPreferences({ cssSnippet: command.cssSnippet });
      break;
    case 'preferences.setCssSnippetEnabled':
      patchPreferences({ cssSnippetEnabled: command.cssSnippetEnabled });
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
    showToast(translateWebNext(state.locale, 'toast.commandFailed'), 'error');
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
