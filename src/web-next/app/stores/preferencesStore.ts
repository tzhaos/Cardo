import { useSyncExternalStore } from 'react';
import type { WorkspaceCommand } from '../../../core/contracts/workspaceCommands';
import type { InvalidationScope } from '../../../core/contracts/runtimeProtocol';
import type { WebNextLocale } from '../../i18n/messages';
import type { WebSearchEngineId } from '../../domain/webSearch';
import { hasRegisteredWebNextTheme, type WebNextColorMode } from '../../themes/themeRegistry';
import {
  dispatchDatabaseCommand,
  getHostPlatformMode,
  queryPreferences,
} from '../../platform/hostPlatform';

interface PreferencesStore {
  colorMode: WebNextColorMode;
  locale: WebNextLocale;
  themeId: string;
  searchEngine: WebSearchEngineId;
  customSearchTemplate: string;
  initialize: () => Promise<void>;
  setColorMode: (colorMode: WebNextColorMode) => void;
  setLocale: (locale: WebNextLocale) => void;
  setThemeId: (themeId: string) => void;
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
    if (hasRegisteredWebNextTheme(themeId)) {
      fireCommand({ type: 'preferences.setTheme', themeId });
    }
  },
  setSearchEngine: (searchEngine: WebSearchEngineId) =>
    fireCommand({ type: 'preferences.setSearchEngine', searchEngine }),
  setCustomSearchTemplate: (customSearchTemplate: string) =>
    fireCommand({ type: 'preferences.setCustomSearchTemplate', customSearchTemplate }),
  toggleColorMode: () => actions.setColorMode(state.colorMode === 'light' ? 'dark' : 'light'),
  toggleLocale: () => actions.setLocale(state.locale === 'en' ? 'zh' : 'en'),
} satisfies Omit<
  PreferencesStore,
  'colorMode' | 'locale' | 'themeId' | 'searchEngine' | 'customSearchTemplate'
>;

let state: PreferencesStore = {
  colorMode: 'light',
  locale: 'en',
  themeId: 'classic',
  searchEngine: 'bing-cn',
  customSearchTemplate: '',
  ...actions,
};

async function refreshPreferences() {
  const preferences = await queryPreferences();
  if (!preferences) throw new Error('KhaosBox preferences are not initialized.');
  state = {
    ...state,
    colorMode: preferences.colorMode,
    locale: preferences.locale,
    themeId: preferences.themeId,
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
    // Runtime mode: scopes (including preferences) applied from command.ok.
    if (getHostPlatformMode() === 'local') {
      await refreshPreferences();
    }
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
