export const APP_THEMES = ['system', 'dark', 'light'] as const;
export type AppTheme = (typeof APP_THEMES)[number];
export type ResolvedAppTheme = Exclude<AppTheme, 'system'>;
export const ACCENT_MODES = ['auto', 'manual'] as const;
export type AccentMode = (typeof ACCENT_MODES)[number];
export const APP_LOCALES = ['zh', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const APP_FONT_FAMILIES = ['system', 'segoe', 'noto'] as const;
export type AppFontFamily = (typeof APP_FONT_FAMILIES)[number];
export const APP_FONT_SIZES = ['13', '14', '15', '16'] as const;
export type AppFontSize = (typeof APP_FONT_SIZES)[number];
export const DEFAULT_LIGHT_ACCENT_COLOR = '#4a8df6';
export const DEFAULT_DARK_ACCENT_COLOR = '#6fa2ff';
export const DEFAULT_MANUAL_ACCENT_COLOR = DEFAULT_DARK_ACCENT_COLOR;
export const MAX_RECENT_ACCENT_COLORS = 5;
export const DEFAULT_WEBDAV_ENDPOINT = 'https://dav.jianguoyun.com/dav/';
export const DEFAULT_WEBDAV_REMOTE_FILE_PATH = 'KhaosBox/khaosbox-sync.json';
export const DEFAULT_FONT_FAMILY: AppFontFamily = 'system';
export const DEFAULT_FONT_SIZE: AppFontSize = '14';

export interface PreferencesState {
  theme: AppTheme;
  locale: AppLocale;
  fontFamily: AppFontFamily;
  fontSize: AppFontSize;
  accentMode: AccentMode;
  accentColor: string;
  recentAccentColors: string[];
  transparencyEnabled: boolean;
  webdavEndpoint: string;
  webdavUsername: string;
  webdavPassword: string;
  webdavRemoteFilePath: string;
  webdavLastSyncedAt: string | null;
}

export const DEFAULT_APP_THEME: AppTheme = 'system';
export const DEFAULT_LOCALE: AppLocale = 'en';

export const DEFAULT_PREFERENCES: PreferencesState = {
  theme: DEFAULT_APP_THEME,
  locale: DEFAULT_LOCALE,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontSize: DEFAULT_FONT_SIZE,
  accentMode: 'auto',
  accentColor: DEFAULT_MANUAL_ACCENT_COLOR,
  recentAccentColors: [DEFAULT_DARK_ACCENT_COLOR, DEFAULT_LIGHT_ACCENT_COLOR],
  transparencyEnabled: false,
  webdavEndpoint: DEFAULT_WEBDAV_ENDPOINT,
  webdavUsername: '',
  webdavPassword: '',
  webdavRemoteFilePath: DEFAULT_WEBDAV_REMOTE_FILE_PATH,
  webdavLastSyncedAt: null,
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

export function resolveFontFamily(fontFamily: AppFontFamily) {
  if (fontFamily === 'segoe') {
    return "'Segoe UI Variable', 'Segoe UI', 'Segoe UI Web Regular', 'Microsoft YaHei UI', sans-serif";
  }

  if (fontFamily === 'noto') {
    return "'Noto Sans SC', 'Microsoft YaHei UI', 'PingFang SC', sans-serif";
  }

  return 'var(--font-sans)';
}

export function resolveFontSize(fontSize: AppFontSize) {
  return `${fontSize}px`;
}

export function resolveAccentColor(
  theme: ResolvedAppTheme,
  accentMode: AccentMode,
  accentColor: string,
) {
  return accentMode === 'manual' ? accentColor : getDefaultAccentColor(theme);
}

export function getMicaColor(theme: ResolvedAppTheme, _transparencyEnabled: boolean) {
  return theme === 'dark' ? '#202020' : '#f3f3f3';
}

export function pushRecentAccentColor(recentAccentColors: string[], accentColor: string) {
  return [accentColor, ...recentAccentColors.filter((color) => color !== accentColor)].slice(
    0,
    MAX_RECENT_ACCENT_COLORS,
  );
}
