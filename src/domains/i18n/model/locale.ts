export const APP_LOCALES = ['zh', 'en'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

export function detectPreferredLocale(): AppLocale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function getAlternateLocale(locale: AppLocale): AppLocale {
  return locale === 'zh' ? 'en' : 'zh';
}
