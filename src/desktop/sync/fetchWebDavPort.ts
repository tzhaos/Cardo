import type { WebDavPort, WebDavSyncConfig } from '../../core/ports/WebDavPort';

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
    const partialPath = segments
      .slice(0, index + 1)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
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

export const fetchWebDavPort: WebDavPort = {
  async testConnection(config) {
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
        throw new Error(
          'WebDAV authentication failed. For Nutstore, use the third-party app password instead of your login password.',
        );
      }

      throw new Error(`WebDAV connection failed (${response.status})`);
    }
  },
  async upload(config, payload) {
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
  },
  async download(config) {
    const response = await fetch(buildRemoteUrl(config), {
      method: 'GET',
      headers: getAuthHeaders(config),
    });

    if (!response.ok) {
      throw new Error(`WebDAV download failed (${response.status})`);
    }

    return response.text();
  },
};
