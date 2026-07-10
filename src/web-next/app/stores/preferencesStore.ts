import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { webNextStorage } from '../../platform/hostPlatform';
import type { WebNextLocale } from '../../i18n/messages';
import { isRegisteredWebNextTheme, type WebNextColorMode } from '../../themes/themeRegistry';

interface StoredPreferences {
  colorMode: WebNextColorMode;
  locale: WebNextLocale;
  themeId: string;
}

interface PreferencesStore {
  colorMode: WebNextColorMode;
  locale: WebNextLocale;
  themeId: string;
  setColorMode: (colorMode: WebNextColorMode) => void;
  setLocale: (locale: WebNextLocale) => void;
  setThemeId: (themeId: string) => void;
  toggleColorMode: () => void;
  toggleLocale: () => void;
}

const STORAGE_KEY = 'khaosbox.web-next.preferences';

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...getInitialPreferences(),
      setColorMode: (colorMode) => set({ colorMode }),
      setLocale: (locale) => set({ locale }),
      setThemeId: (themeId) => {
        if (isRegisteredWebNextTheme(themeId)) {
          set({ themeId });
        }
      },
      toggleColorMode: () =>
        set((state) => ({ colorMode: state.colorMode === 'light' ? 'dark' : 'light' })),
      toggleLocale: () => set((state) => ({ locale: state.locale === 'en' ? 'zh' : 'en' })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => webNextStorage),
      partialize: ({ colorMode, locale, themeId }) => ({ colorMode, locale, themeId }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizePreferences(persistedState, currentState),
      }),
    },
  ),
);

function getInitialPreferences(): StoredPreferences {
  return {
    locale:
      typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
        ? 'zh'
        : 'en',
    colorMode:
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
    themeId: 'classic',
  };
}

function normalizePreferences(input: unknown, fallback: StoredPreferences): StoredPreferences {
  const parsed = (input ?? {}) as Partial<StoredPreferences & { theme: string }>;
  const legacyColorMode = parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : null;

  return {
    colorMode:
      parsed.colorMode === 'dark' || parsed.colorMode === 'light'
        ? parsed.colorMode
        : (legacyColorMode ?? fallback.colorMode),
    locale: parsed.locale === 'zh' ? 'zh' : parsed.locale === 'en' ? 'en' : fallback.locale,
    themeId: isRegisteredWebNextTheme(parsed.themeId) ? parsed.themeId : fallback.themeId,
  };
}
