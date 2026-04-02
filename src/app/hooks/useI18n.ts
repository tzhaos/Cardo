import { translateForLocale, type TranslationParams } from '../../domains/i18n/services/translate';
import { type MessageKey } from '../../domains/i18n/model/messages';
import { usePreferencesStore } from '../stores/usePreferencesStore';

export function useI18n() {
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const toggleLocale = usePreferencesStore((state) => state.toggleLocale);

  const t = (key: MessageKey, params?: TranslationParams) =>
    translateForLocale(locale, key, params);

  return {
    locale,
    setLocale,
    toggleLocale,
    t,
  };
}
