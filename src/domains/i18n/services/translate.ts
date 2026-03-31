import { MESSAGES, type MessageKey } from '../model/messages';
import type { AppLocale } from '../model/locale';
import { DEFAULT_LOCALE } from '../model/locale';
import { useLocaleStore } from '../store/useLocaleStore';

export interface TranslationParams {
  [key: string]: number | string;
}

function formatMessage(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = params[token];
    return value === undefined ? match : String(value);
  });
}

export function translateForLocale(
  locale: AppLocale,
  key: MessageKey,
  params?: TranslationParams,
) {
  const template = MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
  return formatMessage(template, params);
}

export function translate(key: MessageKey, params?: TranslationParams) {
  return translateForLocale(useLocaleStore.getState().locale, key, params);
}
