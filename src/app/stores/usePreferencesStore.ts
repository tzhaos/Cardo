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
import { workspaceStoragePort } from '../ports/defaultPorts';

interface PreferencesStoreState {
  theme: AppTheme;
  locale: AppLocale;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
  toggleLocale: () => void;
  setLocale: (locale: AppLocale) => void;
}

export const usePreferencesStore = create<PreferencesStoreState>()(
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
      storage: createJSONStorage(() => workspaceStoragePort),
      partialize: ({ theme, locale }) => ({ theme, locale }),
    },
  ),
);
