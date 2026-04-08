import type { StateStorage } from 'zustand/middleware';
import { getChromeStorageArea } from '../runtime/chrome';

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as { then: unknown }).then === 'function'
  );
}

function readFromChromeStorage(name: string) {
  const storageArea = getChromeStorageArea();

  if (!storageArea?.get) {
    return Promise.reject(new Error('Chrome storage API is unavailable in the extension runtime.'));
  }

  return new Promise<string | null>((resolve, reject) => {
    try {
      const maybePromise = storageArea.get?.(name, (items) => {
        resolve(items[name] ?? null);
      });

      if (isPromiseLike(maybePromise)) {
        maybePromise
          .then((items: unknown) => {
            const record = items as Record<string, string | null | undefined>;
            resolve(record[name] ?? null);
          })
          .catch((err: unknown) => {
            reject(err instanceof Error ? err : new Error(String(err)));
          });
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function writeToChromeStorage(name: string, value: string) {
  const storageArea = getChromeStorageArea();

  if (!storageArea?.set) {
    return Promise.reject(new Error('Chrome storage API is unavailable in the extension runtime.'));
  }

  return new Promise<void>((resolve, reject) => {
    try {
      const maybePromise = storageArea.set?.({ [name]: value }, () => resolve());

      if (isPromiseLike(maybePromise)) {
        maybePromise
          .then(() => resolve())
          .catch((err: unknown) => {
            reject(err instanceof Error ? err : new Error(String(err)));
          });
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function removeFromChromeStorage(name: string) {
  const storageArea = getChromeStorageArea();

  if (!storageArea?.remove) {
    return Promise.reject(new Error('Chrome storage API is unavailable in the extension runtime.'));
  }

  return new Promise<void>((resolve, reject) => {
    try {
      const maybePromise = storageArea.remove?.(name, () => resolve());

      if (isPromiseLike(maybePromise)) {
        maybePromise
          .then(() => resolve())
          .catch((err: unknown) => {
            reject(err instanceof Error ? err : new Error(String(err)));
          });
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export const extensionStateStorage: StateStorage = {
  getItem(name) {
    return readFromChromeStorage(name);
  },
  setItem(name, value) {
    return writeToChromeStorage(name, value);
  },
  removeItem(name) {
    return removeFromChromeStorage(name);
  },
};
