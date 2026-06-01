import { Cloud, CloudDownload, CloudUpload, Download, Upload } from 'lucide-react';
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
        };
  const actions = useDataSettingsActions(t, copy);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-win-border bg-win-card p-5 shadow-sm">
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
              className="kb-add-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="https://dav.jianguoyun.com/dav/"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.remoteFileLabel}</span>
            <input
              value={actions.webdavRemoteFilePath}
              onChange={(event) => actions.setWebDavRemoteFilePath(event.target.value)}
              className="kb-add-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="KhaosBox/khaosbox-sync.json"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.usernameLabel}</span>
            <input
              value={actions.webdavUsername}
              onChange={(event) => actions.setWebDavUsername(event.target.value)}
              className="kb-add-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="user@example.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.passwordLabel}</span>
            <input
              type="password"
              value={actions.webdavPassword}
              onChange={(event) => actions.setWebDavPassword(event.target.value)}
              className="kb-add-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="******"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={actions.syncAction !== 'idle'}
            onClick={() => void actions.testConnection()}
            className="kb-secondary-button rounded-lg border border-win-border px-3 py-2 text-sm transition-colors disabled:opacity-60"
          >
            {copy.testConnection}
          </button>
          <button
            type="button"
            disabled={actions.syncAction !== 'idle'}
            onClick={() => void actions.uploadNow()}
            className="kb-primary-button rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-60"
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
            className="kb-secondary-button rounded-lg border border-win-border px-3 py-2 text-sm transition-colors disabled:opacity-60"
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

      <div className="rounded-lg border border-win-border bg-win-card p-5 shadow-sm">
        <div className="mb-4 text-sm font-medium text-win-text">{copy.localTitle}</div>
        <div className="flex flex-col rounded-lg border border-win-border bg-win-card shadow-sm">
          <ActionRow
            icon={<Download className="h-5 w-5 text-win-text-secondary" />}
            title={copy.exportTitle}
            onClick={actions.handleExport}
            roundedClassName="rounded-t-lg"
          />
          <div className="mx-4 h-px bg-win-border" />
          <ActionRow
            icon={<Upload className="h-5 w-5 text-win-text-secondary" />}
            title={copy.importTitle}
            onClick={() => actions.fileInputRef.current?.click()}
            roundedClassName="rounded-b-lg"
          />
        </div>
      </div>

      <input
        ref={actions.fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={actions.handleImport}
      />
    </div>
  );
}
