import { useCallback } from 'react';
import { usePreferencesStore } from '../app/stores/preferencesStore';
import { translateWebNext } from './messages';
import type { WebNextMessageKey } from './messages';

export function useI18n() {
  const locale = usePreferencesStore((state) => state.locale);
  const t = useCallback(
    (key: WebNextMessageKey, params?: Record<string, number | string>) =>
      translateWebNext(locale, key, params),
    [locale],
  );
  return { locale, t };
}
