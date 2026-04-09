export const APP_THEMES = ['system', 'dark', 'light'] as const;
export type AppTheme = (typeof APP_THEMES)[number];
export type ResolvedAppTheme = Exclude<AppTheme, 'system'>;

export const APP_LOCALES = ['zh', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export interface PreferencesState {
  theme: AppTheme;
  locale: AppLocale;
}

export const DEFAULT_APP_THEME: AppTheme = 'system';
export const DEFAULT_LOCALE: AppLocale = 'en';

export const DEFAULT_PREFERENCES: PreferencesState = {
  theme: DEFAULT_APP_THEME,
  locale: DEFAULT_LOCALE,
};

export function getAlternateAppTheme(theme: AppTheme): AppTheme {
  return theme === 'dark' ? 'light' : 'dark';
}

export function getAlternateLocale(locale: AppLocale): AppLocale {
  return locale === 'zh' ? 'en' : 'zh';
}

export function detectPreferredLocale(language?: string | null) {
  return (language ?? '').toLowerCase().startsWith('zh') ? 'zh' : DEFAULT_LOCALE;
}

export function resolveAppTheme(theme: AppTheme, prefersDark: boolean): ResolvedAppTheme {
  if (theme === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return theme;
}
