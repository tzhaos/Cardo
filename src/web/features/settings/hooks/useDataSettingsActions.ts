import { useRef, useState, type ChangeEvent } from 'react';
import type { TranslateFn } from '../../../app/hooks/useI18n';
import { presentToastSpec, presentToastText } from '../../../app/presentation/toastSpec';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import {
  runExportWorkspaceForUi,
  runImportWorkspaceForUi,
} from '../../../app/use-cases/runWorkspaceBackupFlow';
import { exportBrowserBookmarks } from '../../../app/use-cases/exportBrowserBookmarks';
import {
  canImportBrowserBookmarksFromBrowser,
  importBrowserBookmarks,
  importBrowserBookmarksFromBrowser,
} from '../../../app/use-cases/importBrowserBookmarks';
import {
  buildCurrentWebDavConfig,
  downloadWorkspaceFromWebDav,
  safeSyncErrorMessage,
  testWebDavConnection,
  uploadWorkspaceToWebDav,
} from '../../../app/use-cases/syncWorkspaceWebDav';

type SyncAction = 'idle' | 'testing' | 'uploading' | 'downloading';

export interface DataSettingsCopy {
  syncIdle: string;
  syncSuccess: string;
  syncTesting: string;
  syncUploading: string;
  syncDownloading: string;
  syncTestSuccess: string;
  syncUploadSuccess: string;
  syncDownloadSuccess: string;
  bookmarkExportFilePrefix: string;
  bookmarkExportSuccess: string;
  bookmarkImportSuccess: (
    addedCount: number,
    duplicateCount: number,
    invalidUrlCount: number,
  ) => string;
  bookmarkImportFailed: string;
  browserBookmarkImportFailed: string;
}

export function useDataSettingsActions(t: TranslateFn, copy: DataSettingsCopy) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bookmarkImportInputRef = useRef<HTMLInputElement>(null);
  const [syncAction, setSyncAction] = useState<SyncAction>('idle');

  const webdavEndpoint = usePreferencesStore((state) => state.webdavEndpoint);
  const setWebDavEndpoint = usePreferencesStore((state) => state.setWebDavEndpoint);
  const webdavUsername = usePreferencesStore((state) => state.webdavUsername);
  const setWebDavUsername = usePreferencesStore((state) => state.setWebDavUsername);
  const webdavPassword = usePreferencesStore((state) => state.webdavPassword);
  const setWebDavPassword = usePreferencesStore((state) => state.setWebDavPassword);
  const webdavRemoteFilePath = usePreferencesStore((state) => state.webdavRemoteFilePath);
  const setWebDavRemoteFilePath = usePreferencesStore((state) => state.setWebDavRemoteFilePath);
  const webdavLastSyncedAt = usePreferencesStore((state) => state.webdavLastSyncedAt);

  const runSyncAction = async (
    nextAction: Exclude<SyncAction, 'idle'>,
    runner: () => Promise<void>,
    successMessage: string,
  ) => {
    setSyncAction(nextAction);

    try {
      await runner();
      presentToastText('success', successMessage);
    } catch (error) {
      presentToastText('error', safeSyncErrorMessage(error));
    } finally {
      setSyncAction('idle');
    }
  };

  const currentSyncStatus =
    syncAction === 'testing'
      ? copy.syncTesting
      : syncAction === 'uploading'
        ? copy.syncUploading
        : syncAction === 'downloading'
          ? copy.syncDownloading
          : webdavLastSyncedAt
            ? copy.syncSuccess
            : copy.syncIdle;

  return {
    fileInputRef,
    bookmarkImportInputRef,
    syncAction,
    currentSyncStatus,
    webdavEndpoint,
    setWebDavEndpoint,
    webdavUsername,
    setWebDavUsername,
    webdavPassword,
    setWebDavPassword,
    webdavRemoteFilePath,
    setWebDavRemoteFilePath,
    webdavLastSyncedAt,
    handleExport: () => {
      presentToastSpec(t, runExportWorkspaceForUi(t));
    },
    handleBookmarkExport: () => {
      exportBrowserBookmarks(copy.bookmarkExportFilePrefix);
      presentToastText('success', copy.bookmarkExportSuccess);
    },
    handleImport: async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      presentToastSpec(t, await runImportWorkspaceForUi(file));

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    handleBookmarkImport: async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      try {
        const summary = await importBrowserBookmarks(file);
        presentToastText(
          'success',
          copy.bookmarkImportSuccess(
            summary.addedCount,
            summary.duplicateCount,
            summary.invalidUrlCount,
          ),
        );
      } catch {
        presentToastText('error', copy.bookmarkImportFailed);
      } finally {
        if (bookmarkImportInputRef.current) {
          bookmarkImportInputRef.current.value = '';
        }
      }
    },
    canImportBrowserBookmarksFromBrowser: canImportBrowserBookmarksFromBrowser(),
    handleBrowserBookmarkImport: async () => {
      try {
        const summary = await importBrowserBookmarksFromBrowser();
        presentToastText(
          'success',
          copy.bookmarkImportSuccess(
            summary.addedCount,
            summary.duplicateCount,
            summary.invalidUrlCount,
          ),
        );
      } catch {
        presentToastText('error', copy.browserBookmarkImportFailed);
      }
    },
    testConnection: () =>
      runSyncAction(
        'testing',
        async () => {
          await testWebDavConnection(buildCurrentWebDavConfig());
        },
        copy.syncTestSuccess,
      ),
    uploadNow: () =>
      runSyncAction(
        'uploading',
        async () => {
          await uploadWorkspaceToWebDav(buildCurrentWebDavConfig());
        },
        copy.syncUploadSuccess,
      ),
    downloadNow: () =>
      runSyncAction(
        'downloading',
        async () => {
          await downloadWorkspaceFromWebDav(buildCurrentWebDavConfig());
        },
        copy.syncDownloadSuccess,
      ),
  };
}
