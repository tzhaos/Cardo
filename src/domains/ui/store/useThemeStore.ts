import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPlatformJSONStorage } from '../../../platform/storage/createPlatformStateStorage';
import { DEFAULT_APP_THEME, getAlternateAppTheme, type AppTheme } from '../model/theme';

interface ThemeState {
  theme: AppTheme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_APP_THEME,
      toggleTheme: () => set({ theme: getAlternateAppTheme(get().theme) }),
    }),
    {
      name: 'khaosbox-theme',
      storage: createPlatformJSONStorage<ThemeState>(),
      partialize: ({ theme }) => ({ theme }),
    },
  ),
);
