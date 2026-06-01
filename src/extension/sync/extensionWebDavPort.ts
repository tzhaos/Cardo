import type { WebDavPort, WebDavSyncConfig } from '../../core/ports/WebDavPort';
import { getChromeRuntimeApi } from '../runtime/chrome';

interface WebDavRuntimeMessage {
  namespace: 'webdav-sync';
  action: 'test' | 'upload' | 'download';
  config: WebDavSyncConfig;
  payload?: string;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

function callBackgroundWebDav(message: WebDavRuntimeMessage) {
  const runtimeApi = getChromeRuntimeApi();

  if (!runtimeApi?.sendMessage) {
    throw new Error(
      'Extension background is unavailable. Reload the extension and try WebDAV sync again.',
    );
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

        resolve(response as { ok: boolean; data?: unknown; error?: string });
      });

      if (isPromiseLike(maybePromise)) {
        maybePromise
          .then((response) => {
            if (typeof response === 'undefined') {
              reject(new Error('Empty WebDAV response'));
              return;
            }

            resolve(response as { ok: boolean; data?: unknown; error?: string });
          })
          .catch((error: unknown) => {
            reject(error instanceof Error ? error : new Error(String(error)));
          });
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

async function runBackgroundWebDav(message: WebDavRuntimeMessage) {
  const response = await callBackgroundWebDav(message);

  if (!response.ok) {
    throw new Error(response.error ?? 'WebDAV request failed');
  }

  return response.data;
}

export const extensionWebDavPort: WebDavPort = {
  async testConnection(config) {
    await runBackgroundWebDav({ namespace: 'webdav-sync', action: 'test', config });
  },
  async upload(config, payload) {
    await runBackgroundWebDav({ namespace: 'webdav-sync', action: 'upload', config, payload });
  },
  async download(config) {
    const data = await runBackgroundWebDav({
      namespace: 'webdav-sync',
      action: 'download',
      config,
    });

    if (data && typeof data === 'object' && 'payload' in data) {
      const payload = (data as { payload?: unknown }).payload;
      return typeof payload === 'string' ? payload : '';
    }

    return '';
  },
};
