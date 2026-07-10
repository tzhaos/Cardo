import { create } from 'zustand';
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
const initialPreferences = readPreferences();

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  ...initialPreferences,
  setColorMode: (colorMode) =>
    set((state) => {
      savePreferences({ colorMode, locale: state.locale, themeId: state.themeId });
      return { colorMode };
    }),
  setLocale: (locale) =>
    set((state) => {
      savePreferences({ colorMode: state.colorMode, locale, themeId: state.themeId });
      return { locale };
    }),
  setThemeId: (themeId) =>
    set((state) => {
      if (!isRegisteredWebNextTheme(themeId)) return state;
      savePreferences({ colorMode: state.colorMode, locale: state.locale, themeId });
      return { themeId };
    }),
  toggleColorMode: () =>
    set((state) => {
      const colorMode = state.colorMode === 'light' ? 'dark' : 'light';
      savePreferences({ colorMode, locale: state.locale, themeId: state.themeId });
      return { colorMode };
    }),
  toggleLocale: () =>
    set((state) => {
      const locale = state.locale === 'en' ? 'zh' : 'en';
      savePreferences({ colorMode: state.colorMode, locale, themeId: state.themeId });
      return { locale };
    }),
}));

function readPreferences(): StoredPreferences {
  const fallback: StoredPreferences = {
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

  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '') as Partial<
      StoredPreferences & { theme: string }
    >;
    const legacyColorMode =
      parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : null;
    return {
      colorMode:
        parsed.colorMode === 'dark' || parsed.colorMode === 'light'
          ? parsed.colorMode
          : (legacyColorMode ?? fallback.colorMode),
      locale: parsed.locale === 'zh' ? 'zh' : parsed.locale === 'en' ? 'en' : fallback.locale,
      themeId: isRegisteredWebNextTheme(parsed.themeId) ? parsed.themeId : fallback.themeId,
    };
  } catch {
    return fallback;
  }
}

function savePreferences(preferences: StoredPreferences) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
