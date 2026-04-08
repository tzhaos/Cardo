import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_PREFERENCES,
  detectPreferredLocale,
  getAlternateAppTheme,
  getAlternateLocale,
  type AppLocale,
  type AppTheme,
} from '../../domains/preferences/model/preferences';
import { log } from '../../lib/log';
import type { WorkspaceStoragePort } from '../ports/WorkspaceStoragePort';
import { workspaceStoragePort } from '../ports/defaultPorts';

interface PreferencesStoreState {
  theme: AppTheme;
  locale: AppLocale;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
  toggleLocale: () => void;
  setLocale: (locale: AppLocale) => void;
}

export function createPreferencesStore(storage: WorkspaceStoragePort) {
  return create<PreferencesStoreState>()(
    persist(
      (set, get) => ({
        ...DEFAULT_PREFERENCES,
        locale: detectPreferredLocale(typeof navigator === 'undefined' ? '' : navigator.language),
        toggleTheme: () => set({ theme: getAlternateAppTheme(get().theme) }),
        setTheme: (theme) => set({ theme }),
        toggleLocale: () => set({ locale: getAlternateLocale(get().locale) }),
        setLocale: (locale) => set({ locale }),
      }),
      {
        name: 'khaosbox-preferences',
        version: 1,
        migrate: (persistedState) =>
          persistedState as Pick<PreferencesStoreState, 'theme' | 'locale'>,
        storage: createJSONStorage(() => storage),
        partialize: ({ theme, locale }) => ({ theme, locale }),
        onRehydrateStorage: () => (_state, error) => {
          if (error) {
            log.error('Preferences store rehydration failed', error);
          }
        },
      },
    ),
  );
}

export const usePreferencesStore = createPreferencesStore(workspaceStoragePort);
