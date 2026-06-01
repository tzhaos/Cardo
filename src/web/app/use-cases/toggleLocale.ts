import { usePreferencesStore } from '../stores/usePreferencesStore';

export function toggleLocale() {
  usePreferencesStore.getState().toggleLocale();
}
