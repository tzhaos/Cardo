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
import type { WebNextLocale } from '../../i18n/messages';
import { hasRegisteredThemePack, type WebNextColorMode } from '../../themes/themeRegistry';
import { dispatchDatabaseCommand, queryPreferences } from '../../platform/hostPlatform';

interface PreferencesStore {
  colorMode: WebNextColorMode;
  locale: WebNextLocale;
  themeId: string;
  fontFamily: FontFamilyId;
  fontScale: FontScale;
  density: Density;
  searchEngine: WebSearchEngineId;
  customSearchTemplate: string;
  initialize: () => Promise<void>;
  setColorMode: (colorMode: WebNextColorMode) => void;
  setLocale: (locale: WebNextLocale) => void;
  setThemeId: (themeId: string) => void;
  setFontFamily: (fontFamily: FontFamilyId) => void;
  setFontScale: (fontScale: FontScale) => void;
  setDensity: (density: Density) => void;
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
  | 'searchEngine'
  | 'customSearchTemplate'
>;

let state: PreferencesStore = {
  colorMode: 'light',
  locale: 'en',
  themeId: 'classic',
  fontFamily: DEFAULT_FONT_FAMILY_ID,
  fontScale: DEFAULT_FONT_SCALE,
  density: DEFAULT_DENSITY,
  searchEngine: 'bing-cn',
  customSearchTemplate: '',
  ...actions,
};

async function refreshPreferences() {
  const preferences = await queryPreferences();
  if (!preferences) throw new Error('Cardo preferences are not initialized.');
  state = {
    ...state,
    colorMode: preferences.colorMode,
    locale: preferences.locale,
    themeId: preferences.themeId,
    fontFamily: preferences.fontFamily,
    fontScale: preferences.fontScale,
    density: preferences.density,
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
    // Scopes (including preferences) applied from command.ok via RuntimeClient.
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
