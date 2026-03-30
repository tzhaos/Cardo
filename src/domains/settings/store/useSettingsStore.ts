import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BoxData } from '../../../types/box';
import { createPlatformJSONStorage } from '../../../platform/storage/createPlatformStateStorage';

interface SettingsState {
  defaultNewBoxLayout: BoxData['layout'];
  allowLocalResourceLaunch: boolean;
  setDefaultNewBoxLayout: (layout: BoxData['layout']) => void;
  setAllowLocalResourceLaunch: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultNewBoxLayout: 'list',
      allowLocalResourceLaunch: true,
      setDefaultNewBoxLayout: (layout) => set({ defaultNewBoxLayout: layout }),
      setAllowLocalResourceLaunch: (enabled) => set({ allowLocalResourceLaunch: enabled }),
    }),
    {
      name: 'khaosbox-settings',
      storage: createPlatformJSONStorage<SettingsState>(),
      partialize: ({ defaultNewBoxLayout, allowLocalResourceLaunch }) => ({
        defaultNewBoxLayout,
        allowLocalResourceLaunch,
      }),
    },
  ),
);
