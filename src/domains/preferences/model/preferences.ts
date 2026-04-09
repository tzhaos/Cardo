export const APP_THEMES = ['system', 'dark', 'light'] as const;
export type AppTheme = (typeof APP_THEMES)[number];
export type ResolvedAppTheme = Exclude<AppTheme, 'system'>;
export const ACCENT_MODES = ['auto', 'manual'] as const;
export type AccentMode = (typeof ACCENT_MODES)[number];

export const APP_LOCALES = ['zh', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_LIGHT_ACCENT_COLOR = '#005fb8';
export const DEFAULT_DARK_ACCENT_COLOR = '#a63a46';
export const DEFAULT_MANUAL_ACCENT_COLOR = DEFAULT_DARK_ACCENT_COLOR;
export const MAX_RECENT_ACCENT_COLORS = 5;

export interface PreferencesState {
  theme: AppTheme;
  locale: AppLocale;
  accentMode: AccentMode;
  accentColor: string;
  recentAccentColors: string[];
  transparencyEnabled: boolean;
}

export const DEFAULT_APP_THEME: AppTheme = 'system';
export const DEFAULT_LOCALE: AppLocale = 'en';

export const DEFAULT_PREFERENCES: PreferencesState = {
  theme: DEFAULT_APP_THEME,
  locale: DEFAULT_LOCALE,
  accentMode: 'auto',
  accentColor: DEFAULT_MANUAL_ACCENT_COLOR,
  recentAccentColors: [DEFAULT_DARK_ACCENT_COLOR, DEFAULT_LIGHT_ACCENT_COLOR],
  transparencyEnabled: true,
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

export function getDefaultAccentColor(theme: ResolvedAppTheme) {
  return theme === 'dark' ? DEFAULT_DARK_ACCENT_COLOR : DEFAULT_LIGHT_ACCENT_COLOR;
}

export function resolveAccentColor(
  theme: ResolvedAppTheme,
  accentMode: AccentMode,
  accentColor: string,
) {
  return accentMode === 'manual' ? accentColor : getDefaultAccentColor(theme);
}

export function getMicaColor(theme: ResolvedAppTheme, transparencyEnabled: boolean) {
  if (theme === 'dark') {
    return transparencyEnabled ? 'rgba(32, 32, 32, 0.85)' : '#202020';
  }

  return transparencyEnabled ? 'rgba(243, 243, 243, 0.85)' : '#f3f3f3';
}

export function pushRecentAccentColor(recentAccentColors: string[], accentColor: string) {
  return [accentColor, ...recentAccentColors.filter((color) => color !== accentColor)].slice(
    0,
    MAX_RECENT_ACCENT_COLORS,
  );
}
