import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_PREFERENCES,
  DEFAULT_WEBDAV_REMOTE_FILE_PATH,
  detectPreferredLocale,
  getAlternateAppTheme,
  getAlternateLocale,
  pushRecentAccentColor,
  type AccentMode,
  type AppFontFamily,
  type AppFontSize,
  type AppLocale,
  type AppTheme,
} from '../../domains/preferences/model/preferences';
import { log } from '../../lib/log';
import type { WorkspaceStoragePort } from '../ports/WorkspaceStoragePort';
import { workspaceStoragePort } from '../ports/defaultPorts';

interface PreferencesStoreState {
  theme: AppTheme;
  locale: AppLocale;
  fontFamily: AppFontFamily;
  fontSize: AppFontSize;
  accentMode: AccentMode;
  accentColor: string;
  recentAccentColors: string[];
  transparencyEnabled: boolean;
  webdavEndpoint: string;
  webdavUsername: string;
  webdavPassword: string;
  webdavRemoteFilePath: string;
  webdavLastSyncedAt: string | null;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
  toggleLocale: () => void;
  setLocale: (locale: AppLocale) => void;
  setFontFamily: (fontFamily: AppFontFamily) => void;
  setFontSize: (fontSize: AppFontSize) => void;
  setAccentMode: (accentMode: AccentMode) => void;
  setAccentColor: (accentColor: string) => void;
  setTransparencyEnabled: (transparencyEnabled: boolean) => void;
  setWebDavEndpoint: (webdavEndpoint: string) => void;
  setWebDavUsername: (webdavUsername: string) => void;
  setWebDavPassword: (webdavPassword: string) => void;
  setWebDavRemoteFilePath: (webdavRemoteFilePath: string) => void;
  setWebDavLastSyncedAt: (webdavLastSyncedAt: string | null) => void;
  replacePersistedPreferences: (
    input: Partial<
      Pick<
        PreferencesStoreState,
        | 'theme'
        | 'locale'
        | 'fontFamily'
        | 'fontSize'
        | 'accentMode'
        | 'accentColor'
        | 'recentAccentColors'
        | 'transparencyEnabled'
      >
    >,
  ) => void;
}

export function createPreferencesStore(storage: WorkspaceStoragePort) {
  return create<PreferencesStoreState>()(
    persist(
      (set, get) => ({
        ...DEFAULT_PREFERENCES,
        locale: detectPreferredLocale(typeof navigator === 'undefined' ? '' : navigator.language),
        toggleTheme: () => set({ theme: getAlternateAppTheme(get().theme) }),
        setTheme: (theme) => set({ theme }),
        toggleLocale: () => set({ locale: getAlternateLocale(get().locale) }),
        setLocale: (locale) => set({ locale }),
        setFontFamily: (fontFamily) => set({ fontFamily }),
        setFontSize: (fontSize) => set({ fontSize }),
        setAccentMode: (accentMode) => set({ accentMode }),
        setAccentColor: (accentColor) =>
          set((state) => ({
            accentColor,
            recentAccentColors: pushRecentAccentColor(state.recentAccentColors, accentColor),
          })),
        setTransparencyEnabled: (transparencyEnabled) => set({ transparencyEnabled }),
        setWebDavEndpoint: (webdavEndpoint) => set({ webdavEndpoint }),
        setWebDavUsername: (webdavUsername) => set({ webdavUsername }),
        setWebDavPassword: (webdavPassword) => set({ webdavPassword }),
        setWebDavRemoteFilePath: (webdavRemoteFilePath) => set({ webdavRemoteFilePath }),
        setWebDavLastSyncedAt: (webdavLastSyncedAt) => set({ webdavLastSyncedAt }),
        replacePersistedPreferences: (input) =>
          set((state) => ({
            theme: input.theme ?? state.theme,
            locale: input.locale ?? state.locale,
            fontFamily: input.fontFamily ?? state.fontFamily,
            fontSize: input.fontSize ?? state.fontSize,
            accentMode: input.accentMode ?? state.accentMode,
            accentColor: input.accentColor ?? state.accentColor,
            recentAccentColors: input.recentAccentColors ?? state.recentAccentColors,
            transparencyEnabled: input.transparencyEnabled ?? state.transparencyEnabled,
          })),
      }),
      {
        name: 'khaosbox-preferences',
        version: 4,
        migrate: (persistedState) => {
          const migratedState = {
            ...DEFAULT_PREFERENCES,
            ...(persistedState as Partial<PreferencesStoreState>),
          };

          if (
            !migratedState.webdavRemoteFilePath ||
            migratedState.webdavRemoteFilePath === 'khaosbox-sync.json'
          ) {
            migratedState.webdavRemoteFilePath = DEFAULT_WEBDAV_REMOTE_FILE_PATH;
          }

          return migratedState;
        },
        storage: createJSONStorage(() => storage),
        partialize: ({
          theme,
          locale,
          fontFamily,
          fontSize,
          accentMode,
          accentColor,
          recentAccentColors,
          transparencyEnabled,
          webdavEndpoint,
          webdavUsername,
          webdavPassword,
          webdavRemoteFilePath,
          webdavLastSyncedAt,
        }) => ({
          theme,
          locale,
          fontFamily,
          fontSize,
          accentMode,
          accentColor,
          recentAccentColors,
          transparencyEnabled,
          webdavEndpoint,
          webdavUsername,
          webdavPassword,
          webdavRemoteFilePath,
          webdavLastSyncedAt,
        }),
        onRehydrateStorage: () => (_state, error) => {
          if (error) {
            log.error('Preferences store rehydration failed', error);
          }
        },
      },
    ),
  );
}

export const usePreferencesStore = createPreferencesStore(workspaceStoragePort);
