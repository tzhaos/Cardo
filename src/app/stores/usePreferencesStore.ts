import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_PREFERENCES,
  detectPreferredLocale,
  getAlternateAppTheme,
  getAlternateLocale,
  pushRecentAccentColor,
  type AccentMode,
  type AppLocale,
  type AppTheme,
} from '../../domains/preferences/model/preferences';
import { log } from '../../lib/log';
import type { WorkspaceStoragePort } from '../ports/WorkspaceStoragePort';
import { workspaceStoragePort } from '../ports/defaultPorts';

interface PreferencesStoreState {
  theme: AppTheme;
  locale: AppLocale;
  accentMode: AccentMode;
  accentColor: string;
  recentAccentColors: string[];
  transparencyEnabled: boolean;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
  toggleLocale: () => void;
  setLocale: (locale: AppLocale) => void;
  setAccentMode: (accentMode: AccentMode) => void;
  setAccentColor: (accentColor: string) => void;
  setTransparencyEnabled: (transparencyEnabled: boolean) => void;
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
        setAccentMode: (accentMode) => set({ accentMode }),
        setAccentColor: (accentColor) =>
          set((state) => ({
            accentColor,
            recentAccentColors: pushRecentAccentColor(state.recentAccentColors, accentColor),
          })),
        setTransparencyEnabled: (transparencyEnabled) => set({ transparencyEnabled }),
      }),
      {
        name: 'khaosbox-preferences',
        version: 2,
        migrate: (persistedState) => ({
          ...DEFAULT_PREFERENCES,
          ...(persistedState as Partial<PreferencesStoreState>),
        }),
        storage: createJSONStorage(() => storage),
        partialize: ({
          theme,
          locale,
          accentMode,
          accentColor,
          recentAccentColors,
          transparencyEnabled,
        }) => ({
          theme,
          locale,
          accentMode,
          accentColor,
          recentAccentColors,
          transparencyEnabled,
        }),
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
