import { Bookmark, Cloud, CloudDownload, CloudUpload, Download, Globe2, Upload } from 'lucide-react';
import { useI18n } from '../../../app/hooks/useI18n';
import { useDataSettingsActions } from '../hooks/useDataSettingsActions';
import { ActionRow } from './SettingsControls';

export function DataPanel() {
  const { t, locale } = useI18n();
  const copy =
    locale === 'zh'
      ? {
          localTitle: '\u672c\u5730\u6570\u636e',
          syncTitle: 'WebDAV',
          endpointLabel: '\u5730\u5740',
          usernameLabel: '\u8d26\u53f7',
          passwordLabel: '\u5e94\u7528\u5bc6\u7801',
          remoteFileLabel: '\u8fdc\u7a0b\u6587\u4ef6',
          testConnection: '\u6d4b\u8bd5\u8fde\u63a5',
          uploadNow: '\u4e0a\u4f20',
          downloadNow: '\u4e0b\u8f7d',
          syncIdle: '\u672a\u8fde\u63a5',
          syncSuccess: '\u5df2\u5c31\u7eea',
          syncTesting: '\u6d4b\u8bd5\u4e2d',
          syncUploading: '\u4e0a\u4f20\u4e2d',
          syncDownloading: '\u4e0b\u8f7d\u4e2d',
          syncTestSuccess: 'WebDAV \u8fde\u63a5\u6210\u529f',
          syncUploadSuccess: '\u5df2\u4e0a\u4f20\u5230 WebDAV',
          syncDownloadSuccess: '\u5df2\u4ece WebDAV \u540c\u6b65',
          lastSyncedLabel: '\u4e0a\u6b21\u540c\u6b65',
          notSyncedYet: '\u5c1a\u672a\u540c\u6b65',
          exportTitle: '\u5bfc\u51fa\u5de5\u4f5c\u533a',
          importTitle: '\u5bfc\u5165\u5de5\u4f5c\u533a',
          bookmarksTitle: '\u7f51\u7ad9\u6536\u85cf',
          exportBookmarksTitle: '\u5bfc\u51fa\u6d4f\u89c8\u5668\u6536\u85cf\u5939',
          importBookmarksTitle: '\u5bfc\u5165\u6d4f\u89c8\u5668\u6536\u85cf\u5939',
          importBookmarksFromBrowserTitle: '\u4ece\u5f53\u524d\u6d4f\u89c8\u5668\u5bfc\u5165',
          bookmarkExportFilePrefix: 'khaosbox-\u6536\u85cf\u5939',
          bookmarkExportSuccess: '\u6536\u85cf\u5939 HTML \u5df2\u5bfc\u51fa',
          bookmarkImportSuccess: (added: number, duplicates: number, invalid: number) =>
            `\u5df2\u5bfc\u5165 ${added} \u4e2a\u6536\u85cf\uff0c\u8df3\u8fc7 ${duplicates} \u4e2a\u91cd\u590d\uff0c${invalid} \u4e2a\u65e0\u6548 URL`,
          bookmarkImportFailed:
            '\u5bfc\u5165\u5931\u8d25\uff1a\u8bf7\u9009\u62e9\u6d4f\u89c8\u5668\u5bfc\u51fa\u7684\u4e66\u7b7e HTML',
          browserBookmarkImportFailed:
            '\u5bfc\u5165\u5931\u8d25\uff1a\u8bf7\u5141\u8bb8\u8bfb\u53d6\u6d4f\u89c8\u5668\u6536\u85cf\u5939\u540e\u91cd\u8bd5',
        }
      : {
          localTitle: 'Local data',
          syncTitle: 'WebDAV',
          endpointLabel: 'Endpoint',
          usernameLabel: 'Username',
          passwordLabel: 'App password',
          remoteFileLabel: 'Remote file',
          testConnection: 'Test',
          uploadNow: 'Upload',
          downloadNow: 'Download',
          syncIdle: 'Idle',
          syncSuccess: 'Ready',
          syncTesting: 'Testing',
          syncUploading: 'Uploading',
          syncDownloading: 'Downloading',
          syncTestSuccess: 'WebDAV connected',
          syncUploadSuccess: 'Uploaded to WebDAV',
          syncDownloadSuccess: 'Downloaded from WebDAV',
          lastSyncedLabel: 'Last synced',
          notSyncedYet: 'Not synced yet',
          exportTitle: 'Export workspace',
          importTitle: 'Import workspace',
          bookmarksTitle: 'Website bookmarks',
          exportBookmarksTitle: 'Export browser bookmarks',
          importBookmarksTitle: 'Import browser bookmarks',
          importBookmarksFromBrowserTitle: 'Import from this browser',
          bookmarkExportFilePrefix: 'khaosbox-bookmarks',
          bookmarkExportSuccess: 'Bookmarks HTML exported',
          bookmarkImportSuccess: (added: number, duplicates: number, invalid: number) =>
            `Imported ${added} bookmark(s), skipped ${duplicates} duplicate(s), ${invalid} invalid URL(s)`,
          bookmarkImportFailed: 'Import failed: choose a browser bookmarks HTML file',
          browserBookmarkImportFailed: 'Import failed: allow browser bookmarks access and try again',
        };
  const actions = useDataSettingsActions(t, copy);

  return (
    <div className="flex flex-col gap-4">
      <div className="kb-soft-card rounded-2xl border p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-win-text-secondary" />
            <h3 className="text-sm font-medium text-win-text">{copy.syncTitle}</h3>
          </div>
          <div className="rounded-full bg-win-bg-secondary px-3 py-1 text-xs text-win-text-secondary">
            {actions.currentSyncStatus}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.endpointLabel}</span>
            <input
              value={actions.webdavEndpoint}
              onChange={(event) => actions.setWebDavEndpoint(event.target.value)}
              className="kb-add-input rounded-2xl px-3 py-2 text-sm outline-none"
              placeholder="https://dav.jianguoyun.com/dav/"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.remoteFileLabel}</span>
            <input
              value={actions.webdavRemoteFilePath}
              onChange={(event) => actions.setWebDavRemoteFilePath(event.target.value)}
              className="kb-add-input rounded-2xl px-3 py-2 text-sm outline-none"
              placeholder="KhaosBox/khaosbox-sync.json"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.usernameLabel}</span>
            <input
              value={actions.webdavUsername}
              onChange={(event) => actions.setWebDavUsername(event.target.value)}
              className="kb-add-input rounded-2xl px-3 py-2 text-sm outline-none"
              placeholder="user@example.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.passwordLabel}</span>
            <input
              type="password"
              value={actions.webdavPassword}
              onChange={(event) => actions.setWebDavPassword(event.target.value)}
              className="kb-add-input rounded-2xl px-3 py-2 text-sm outline-none"
              placeholder="******"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={actions.syncAction !== 'idle'}
            onClick={() => void actions.testConnection()}
            className="kb-secondary-button rounded-full border px-3 py-2 text-sm transition-colors disabled:opacity-60"
          >
            {copy.testConnection}
          </button>
          <button
            type="button"
            disabled={actions.syncAction !== 'idle'}
            onClick={() => void actions.uploadNow()}
            className="kb-primary-button rounded-full px-3 py-2 text-sm transition-colors disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <CloudUpload className="h-4 w-4" />
              {copy.uploadNow}
            </span>
          </button>
          <button
            type="button"
            disabled={actions.syncAction !== 'idle'}
            onClick={() => void actions.downloadNow()}
            className="kb-secondary-button rounded-full border px-3 py-2 text-sm transition-colors disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <CloudDownload className="h-4 w-4" />
              {copy.downloadNow}
            </span>
          </button>
        </div>

        <div className="mt-4 text-xs text-win-text-secondary">
          {copy.lastSyncedLabel}: {actions.webdavLastSyncedAt ?? copy.notSyncedYet}
        </div>
      </div>

      <div className="kb-soft-card rounded-2xl border p-5">
        <div className="mb-4 text-sm font-medium text-win-text">{copy.localTitle}</div>
        <div className="kb-add-panel flex flex-col rounded-2xl border">
          <ActionRow
            icon={<Download className="h-5 w-5 text-win-text-secondary" />}
            title={copy.exportTitle}
            onClick={actions.handleExport}
            roundedClassName="rounded-t-2xl"
          />
          <div className="mx-4 h-px bg-win-border" />
          <ActionRow
            icon={<Upload className="h-5 w-5 text-win-text-secondary" />}
            title={copy.importTitle}
            onClick={() => actions.fileInputRef.current?.click()}
            roundedClassName="rounded-b-2xl"
          />
        </div>

        <div className="mt-4 mb-4 text-sm font-medium text-win-text">{copy.bookmarksTitle}</div>
        <div className="kb-add-panel flex flex-col rounded-2xl border">
          <ActionRow
            icon={<Bookmark className="h-5 w-5 text-win-text-secondary" />}
            title={copy.exportBookmarksTitle}
            onClick={actions.handleBookmarkExport}
            roundedClassName="rounded-t-2xl"
          />
          <div className="mx-4 h-px bg-win-border" />
          <ActionRow
            icon={<Upload className="h-5 w-5 text-win-text-secondary" />}
            title={copy.importBookmarksTitle}
            onClick={() => actions.bookmarkImportInputRef.current?.click()}
            roundedClassName={
              actions.canImportBrowserBookmarksFromBrowser ? '' : 'rounded-b-2xl'
            }
          />
          {actions.canImportBrowserBookmarksFromBrowser ? (
            <>
              <div className="mx-4 h-px bg-win-border" />
              <ActionRow
                icon={<Globe2 className="h-5 w-5 text-win-text-secondary" />}
                title={copy.importBookmarksFromBrowserTitle}
                onClick={() => void actions.handleBrowserBookmarkImport()}
                roundedClassName="rounded-b-2xl"
              />
            </>
          ) : null}
        </div>
      </div>

      <input
        ref={actions.fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={actions.handleImport}
      />
      <input
        ref={actions.bookmarkImportInputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={actions.handleBookmarkImport}
      />
    </div>
  );
}
