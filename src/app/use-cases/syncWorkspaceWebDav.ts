import {
  ACCENT_MODES,
  APP_LOCALES,
  APP_THEMES,
  DEFAULT_PREFERENCES,
  pushRecentAccentColor,
  type PreferencesState,
} from '../../domains/preferences/model/preferences';
import {
  createWorkspaceExportDocument,
  parseWorkspaceExportDocument,
} from '../../domains/workspace/model/workspaceCodec';
import { getChromeRuntimeApi } from '../../extension/runtime/chrome';
import { log } from '../../lib/log';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

interface WebDavSyncConfig {
  endpoint: string;
  username: string;
  password: string;
  remoteFilePath: string;
}

interface WorkspaceSyncDocumentV1 {
  version: 1;
  exportedAt: string;
  workspace: ReturnType<typeof createWorkspaceExportDocument>;
  preferences: Pick<
    PreferencesState,
    'theme' | 'locale' | 'accentMode' | 'accentColor' | 'recentAccentColors' | 'transparencyEnabled'
  >;
}

interface WebDavRuntimeMessage {
  namespace: 'webdav-sync';
  action: 'test' | 'upload' | 'download';
  config: WebDavSyncConfig;
  payload?: string;
}

function encodeBasicAuth(username: string, password: string) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.trim().replace(/\/+$/, '');
}

function normalizeDirectoryEndpoint(endpoint: string) {
  const normalized = normalizeEndpoint(endpoint);

  if (!normalized) {
    throw new Error('Missing WebDAV endpoint');
  }

  return `${normalized}/`;
}

function normalizeRemoteFilePath(remoteFilePath: string) {
  return remoteFilePath.trim().replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function encodeRemotePath(remoteFilePath: string) {
  return normalizeRemoteFilePath(remoteFilePath)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function buildRemoteUrl(config: WebDavSyncConfig) {
  const endpoint = normalizeEndpoint(config.endpoint);
  const remoteFilePath = encodeRemotePath(config.remoteFilePath);

  if (!endpoint || !remoteFilePath) {
    throw new Error('Missing WebDAV endpoint or remote file path');
  }

  return `${endpoint}/${remoteFilePath}`;
}

function buildRemoteDirectoryUrls(config: WebDavSyncConfig) {
  const endpoint = normalizeEndpoint(config.endpoint);
  const segments = normalizeRemoteFilePath(config.remoteFilePath)
    .split('/')
    .filter(Boolean)
    .slice(0, -1);

  return segments.map((_, index) => {
    const partialPath = segments.slice(0, index + 1).map((segment) => encodeURIComponent(segment)).join('/');
    return `${endpoint}/${partialPath}`;
  });
}

function getAuthHeaders(config: WebDavSyncConfig) {
  if (!config.username.trim() || !config.password.trim()) {
    throw new Error('Missing WebDAV username or password');
  }

  return {
    Authorization: encodeBasicAuth(config.username.trim(), config.password),
  };
}

async function ensureRemoteDirectories(config: WebDavSyncConfig) {
  const directoryUrls = buildRemoteDirectoryUrls(config);

  for (const directoryUrl of directoryUrls) {
    const response = await fetch(directoryUrl, {
      method: 'MKCOL',
      headers: getAuthHeaders(config),
    });

    if ([200, 201, 204, 301, 302, 405].includes(response.status)) {
      continue;
    }

    throw new Error(`WebDAV directory setup failed (${response.status})`);
  }
}

function callBackgroundWebDav(message: WebDavRuntimeMessage) {
  const runtimeApi = getChromeRuntimeApi();

  if (!runtimeApi?.sendMessage) {
    return null;
  }

  const sendMessage = runtimeApi.sendMessage;

  return new Promise<{ ok: boolean; data?: unknown; error?: string }>((resolve, reject) => {
    try {
      const maybePromise = sendMessage(message, (response) => {
        const runtimeError = runtimeApi.lastError?.message;

        if (runtimeError) {
          reject(
            new Error(
              runtimeError.includes('Receiving end does not exist')
                ? 'Extension background is unavailable. Reload the extension and try WebDAV sync again.'
                : runtimeError,
            ),
          );
          return;
        }

        if (typeof response === 'undefined') {
          reject(new Error('Empty WebDAV response'));
          return;
        }

        resolve(response as never);
      });

      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        (maybePromise as Promise<unknown>)
          .then((response) => {
            if (typeof response === 'undefined') {
              reject(new Error('Empty WebDAV response'));
              return;
            }

            resolve(response as never);
          })
          .catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function createSyncDocument(): WorkspaceSyncDocumentV1 {
  const snapshot = useWorkspaceStore.getState().snapshot;
  const {
    theme,
    locale,
    accentMode,
    accentColor,
    recentAccentColors,
    transparencyEnabled,
  } = usePreferencesStore.getState();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace: createWorkspaceExportDocument(snapshot),
    preferences: {
      theme,
      locale,
      accentMode,
      accentColor,
      recentAccentColors,
      transparencyEnabled,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeSyncedPreferences(
  input: unknown,
): Pick<
  PreferencesState,
  'theme' | 'locale' | 'accentMode' | 'accentColor' | 'recentAccentColors' | 'transparencyEnabled'
> {
  const record = isRecord(input) ? input : {};
  const theme = typeof record.theme === 'string' && APP_THEMES.includes(record.theme as never)
    ? (record.theme as PreferencesState['theme'])
    : DEFAULT_PREFERENCES.theme;
  const locale =
    typeof record.locale === 'string' && APP_LOCALES.includes(record.locale as never)
      ? (record.locale as PreferencesState['locale'])
      : DEFAULT_PREFERENCES.locale;
  const accentMode =
    typeof record.accentMode === 'string' && ACCENT_MODES.includes(record.accentMode as never)
      ? (record.accentMode as PreferencesState['accentMode'])
      : DEFAULT_PREFERENCES.accentMode;
  const accentColor =
    typeof record.accentColor === 'string' && record.accentColor.trim()
      ? record.accentColor
      : DEFAULT_PREFERENCES.accentColor;
  const recentAccentColors = Array.isArray(record.recentAccentColors)
    ? record.recentAccentColors.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    : DEFAULT_PREFERENCES.recentAccentColors;
  const transparencyEnabled =
    typeof record.transparencyEnabled === 'boolean'
      ? record.transparencyEnabled
      : DEFAULT_PREFERENCES.transparencyEnabled;

  return {
    theme,
    locale,
    accentMode,
    accentColor,
    recentAccentColors: pushRecentAccentColor(recentAccentColors, accentColor),
    transparencyEnabled,
  };
}

function parseSyncDocument(input: unknown) {
  if (!isRecord(input) || input.version !== 1) {
    throw new Error('Invalid WebDAV sync document');
  }

  return {
    version: 1 as const,
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
    workspace: parseWorkspaceExportDocument(input.workspace),
    preferences: sanitizeSyncedPreferences(input.preferences),
  };
}

export async function testWebDavConnection(config: WebDavSyncConfig) {
  const backgroundResponse = await callBackgroundWebDav({
    namespace: 'webdav-sync',
    action: 'test',
    config,
  });

  if (backgroundResponse) {
    if (!backgroundResponse.ok) {
      throw new Error(backgroundResponse.error ?? 'WebDAV connection failed');
    }

    return;
  }

  const response = await fetch(normalizeDirectoryEndpoint(config.endpoint), {
    method: 'PROPFIND',
    headers: {
      ...getAuthHeaders(config),
      Depth: '0',
      'Content-Type': 'application/xml; charset=utf-8',
    },
    body: `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname />
  </d:prop>
</d:propfind>`,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('WebDAV authentication failed. For Nutstore, use the third-party app password instead of your login password.');
    }

    throw new Error(`WebDAV connection failed (${response.status})`);
  }
}

export async function uploadWorkspaceToWebDav(config: WebDavSyncConfig) {
  const syncDocument = createSyncDocument();
  const payload = JSON.stringify(syncDocument, null, 2);
  const backgroundResponse = await callBackgroundWebDav({
    namespace: 'webdav-sync',
    action: 'upload',
    config,
    payload,
  });

  if (backgroundResponse) {
    if (!backgroundResponse.ok) {
      throw new Error(backgroundResponse.error ?? 'WebDAV upload failed');
    }

    const syncedAt = new Date().toISOString();
    usePreferencesStore.getState().setWebDavLastSyncedAt(syncedAt);
    return { syncedAt };
  }

  await ensureRemoteDirectories(config);

  const response = await fetch(buildRemoteUrl(config), {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(config),
      'Content-Type': 'application/json',
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`WebDAV upload failed (${response.status})`);
  }

  const syncedAt = new Date().toISOString();
  usePreferencesStore.getState().setWebDavLastSyncedAt(syncedAt);
  return { syncedAt };
}

export async function downloadWorkspaceFromWebDav(config: WebDavSyncConfig) {
  const backgroundResponse = await callBackgroundWebDav({
    namespace: 'webdav-sync',
    action: 'download',
    config,
  });

  if (backgroundResponse) {
    if (!backgroundResponse.ok) {
      throw new Error(backgroundResponse.error ?? 'WebDAV download failed');
    }

    const backgroundPayload =
      backgroundResponse.data && typeof backgroundResponse.data === 'object'
        ? (backgroundResponse.data as { payload?: string }).payload
        : '';
    const payload = parseSyncDocument(JSON.parse(String(backgroundPayload ?? '')) as unknown);
    useWorkspaceStore.getState().dispatch({
      type: 'workspace.replaceBoxes',
      boxes: payload.workspace.boxes,
    });
    usePreferencesStore.getState().replacePersistedPreferences(payload.preferences);
    usePreferencesStore.getState().setWebDavLastSyncedAt(payload.exportedAt);
    return payload;
  }

  const response = await fetch(buildRemoteUrl(config), {
    method: 'GET',
    headers: getAuthHeaders(config),
  });

  if (!response.ok) {
    throw new Error(`WebDAV download failed (${response.status})`);
  }

  const payload = parseSyncDocument(JSON.parse(await response.text()) as unknown);

  useWorkspaceStore.getState().dispatch({
    type: 'workspace.replaceBoxes',
    boxes: payload.workspace.boxes,
  });
  usePreferencesStore.getState().replacePersistedPreferences(payload.preferences);
  usePreferencesStore.getState().setWebDavLastSyncedAt(payload.exportedAt);

  return payload;
}

export function buildCurrentWebDavConfig(): WebDavSyncConfig {
  const {
    webdavEndpoint,
    webdavUsername,
    webdavPassword,
    webdavRemoteFilePath,
  } = usePreferencesStore.getState();

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
