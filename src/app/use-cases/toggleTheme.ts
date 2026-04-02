import { usePreferencesStore } from '../stores/usePreferencesStore';

export function toggleTheme() {
  usePreferencesStore.getState().toggleTheme();
}
