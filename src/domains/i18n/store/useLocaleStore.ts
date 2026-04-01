import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createExtensionJSONStorage } from '../../../extension/storage/createExtensionJSONStorage';
import { detectPreferredLocale, getAlternateLocale, type AppLocale } from '../model/locale';

interface LocaleState {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: detectPreferredLocale(),
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: getAlternateLocale(get().locale) }),
    }),
    {
      name: 'khaosbox-locale',
      storage: createExtensionJSONStorage<LocaleState>(),
      partialize: ({ locale }) => ({ locale }),
    },
  ),
);
