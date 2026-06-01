import {
  createWorkspaceSyncDocument,
  parseWorkspaceSyncDocument,
} from '../../../core/services/workspaceSyncDocument';
import { createWorkspaceSnapshotFromExportDocument } from '../../../core/domains/workspace/model/workspaceCodec';
import { log } from '../../../core/log';
import type { WebDavSyncConfig } from '../../../core/ports/WebDavPort';
import { webDavPort } from '../ports/defaultPorts';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

function createCurrentSyncDocument(exportedAt: string) {
  const snapshot = useWorkspaceStore.getState().snapshot;
  const preferences = usePreferencesStore.getState();

  return createWorkspaceSyncDocument(snapshot, preferences, exportedAt);
}

export async function testWebDavConnection(config: WebDavSyncConfig) {
  await webDavPort.testConnection(config);
}

export async function uploadWorkspaceToWebDav(config: WebDavSyncConfig) {
  const syncedAt = new Date().toISOString();
  const syncDocument = createCurrentSyncDocument(syncedAt);
  const payload = JSON.stringify(syncDocument, null, 2);
  await webDavPort.upload(config, payload);

  usePreferencesStore.getState().setWebDavLastSyncedAt(syncedAt);
  return { syncedAt };
}

export async function downloadWorkspaceFromWebDav(config: WebDavSyncConfig) {
  const payload = parseWorkspaceSyncDocument(
    JSON.parse(await webDavPort.download(config)) as unknown,
    new Date().toISOString(),
  );

  useWorkspaceStore.getState().dispatch({
    type: 'workspace.replace',
    snapshot: createWorkspaceSnapshotFromExportDocument(payload.workspace),
  });
  usePreferencesStore.getState().replacePersistedPreferences(payload.preferences);
  usePreferencesStore.getState().setWebDavLastSyncedAt(payload.exportedAt);

  return payload;
}

export function buildCurrentWebDavConfig(): WebDavSyncConfig {
  const { webdavEndpoint, webdavUsername, webdavPassword, webdavRemoteFilePath } =
    usePreferencesStore.getState();

  return {
    endpoint: webdavEndpoint,
    username: webdavUsername,
    password: webdavPassword,
    remoteFilePath: webdavRemoteFilePath,
  };
}

export function safeSyncErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  log.error('WebDAV sync failed', error);

  if (message.includes('Extension background is unavailable')) {
    return 'WebDAV 后台服务不可用。请先到扩展管理页重新加载 KhaosBox，再重试。';
  }

  if (message.includes('WebDAV upload failed (404)')) {
    return 'WebDAV 上传地址无效。已改为默认使用 KhaosBox/khaosbox-sync.json，请重新加载扩展后再试。';
  }

  return message;
}
