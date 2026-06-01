import {
  translateForLocale,
  type TranslationParams,
} from '../../../core/domains/i18n/services/translate';
import { type MessageKey } from '../../../core/domains/i18n/model/messages';
import { usePreferencesStore } from '../stores/usePreferencesStore';

export type TranslateFn = (key: MessageKey, params?: TranslationParams) => string;

export function useI18n() {
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const toggleLocale = usePreferencesStore((state) => state.toggleLocale);

  const t: TranslateFn = (key, params) => translateForLocale(locale, key, params);

  return {
    locale,
    setLocale,
    toggleLocale,
    t,
  };
}
