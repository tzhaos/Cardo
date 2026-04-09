function normalizeEndpoint(endpoint) {
  return String(endpoint ?? '').trim().replace(/\/+$/, '');
}

function normalizeDirectoryEndpoint(endpoint) {
  const normalized = normalizeEndpoint(endpoint);

  if (!normalized) {
    throw new Error('Missing WebDAV endpoint');
  }

  return `${normalized}/`;
}

function normalizeRemoteFilePath(remoteFilePath) {
  return String(remoteFilePath ?? '')
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

function encodeRemotePath(remoteFilePath) {
  return normalizeRemoteFilePath(remoteFilePath)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function buildRemoteUrl(config) {
  const endpoint = normalizeEndpoint(config.endpoint);
  const remoteFilePath = encodeRemotePath(config.remoteFilePath);

  if (!endpoint || !remoteFilePath) {
    throw new Error('Missing WebDAV endpoint or remote file path');
  }

  return `${endpoint}/${remoteFilePath}`;
}

function buildRemoteDirectoryUrls(config) {
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

function encodeBasicAuth(username, password) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

function getAuthHeaders(config) {
  const username = String(config.username ?? '').trim();
  const password = String(config.password ?? '');

  if (!username || !password) {
    throw new Error('Missing WebDAV username or password');
  }

  return {
    Authorization: encodeBasicAuth(username, password),
  };
}

async function testConnection(config) {
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

  return { ok: true };
}

async function upload(config, payload) {
  for (const directoryUrl of buildRemoteDirectoryUrls(config)) {
    const mkcolResponse = await fetch(directoryUrl, {
      method: 'MKCOL',
      headers: getAuthHeaders(config),
    });

    if (![200, 201, 204, 301, 302, 405].includes(mkcolResponse.status)) {
      throw new Error(`WebDAV directory setup failed (${mkcolResponse.status})`);
    }
  }

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

  return { ok: true };
}

async function download(config) {
  const response = await fetch(buildRemoteUrl(config), {
    method: 'GET',
    headers: getAuthHeaders(config),
  });

  if (!response.ok) {
    throw new Error(`WebDAV download failed (${response.status})`);
  }

  return {
    ok: true,
    payload: await response.text(),
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.namespace !== 'webdav-sync') {
    return false;
  }

  const run = async () => {
    try {
      if (message.action === 'test') {
        sendResponse({ ok: true, data: await testConnection(message.config) });
        return;
      }

      if (message.action === 'upload') {
        sendResponse({ ok: true, data: await upload(message.config, message.payload) });
        return;
      }

      if (message.action === 'download') {
        sendResponse({ ok: true, data: await download(message.config) });
        return;
      }

      sendResponse({ ok: false, error: 'Unknown WebDAV action' });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  void run();
  return true;
});
