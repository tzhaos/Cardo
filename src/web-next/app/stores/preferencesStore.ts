import { useSyncExternalStore } from 'react';
import type { WorkspaceCommand } from '../../../core/contracts/workspaceCommands';
import type { InvalidationScope } from '../../../core/contracts/runtimeProtocol';
import type { WebNextLocale } from '../../i18n/messages';
import type { WebSearchEngineId } from '../../domain/webSearch';
import { hasRegisteredWebNextTheme, type WebNextColorMode } from '../../themes/themeRegistry';
import { dispatchDatabaseCommand, queryPreferences } from '../../platform/hostPlatform';

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

function emitChange() {
  for (const listener of listeners) listener();
}

function patchPreferences(
  patch: Partial<
    Pick<
      PreferencesStore,
      'colorMode' | 'locale' | 'themeId' | 'searchEngine' | 'customSearchTemplate'
    >
  >,
) {
  state = { ...state, ...patch };
  emitChange();
}

async function refreshPreferences() {
  const preferences = await queryPreferences();
  if (!preferences) throw new Error('Cardo preferences are not initialized.');
  state = {
    ...state,
    colorMode: preferences.colorMode,
    locale: preferences.locale,
    themeId: preferences.themeId,
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
