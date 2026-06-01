import { DEFAULT_LOCALE, type AppLocale } from '../../preferences/model/preferences';
import { MESSAGES, type MessageKey } from '../model/messages';

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

export function translateForLocale(locale: AppLocale, key: MessageKey, params?: TranslationParams) {
  const template = MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
  return formatMessage(template, params);
}
