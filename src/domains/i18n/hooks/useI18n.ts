import { translateForLocale, type TranslationParams } from '../services/translate';
import { type MessageKey } from '../model/messages';
import { useLocaleStore } from '../store/useLocaleStore';

export function useI18n() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const toggleLocale = useLocaleStore((state) => state.toggleLocale);

  const t = (key: MessageKey, params?: TranslationParams) =>
    translateForLocale(locale, key, params);

  return {
    locale,
    setLocale,
    toggleLocale,
    t,
  };
}
