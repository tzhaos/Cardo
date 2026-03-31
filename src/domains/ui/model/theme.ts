export type AppTheme = 'dark' | 'light';

export const DEFAULT_APP_THEME: AppTheme = 'dark';

export function getAlternateAppTheme(theme: AppTheme): AppTheme {
  return theme === 'dark' ? 'light' : 'dark';
}
