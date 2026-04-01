import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createExtensionJSONStorage } from '../../../extension/storage/createExtensionJSONStorage';
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
      storage: createExtensionJSONStorage<ThemeState>(),
      partialize: ({ theme }) => ({ theme }),
    },
  ),
);
