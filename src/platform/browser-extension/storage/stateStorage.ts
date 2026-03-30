import type { StateStorage } from 'zustand/middleware';
import { getChromeStorageArea } from '../../runtime/environment';
import { webStateStorage } from '../../web/storage/stateStorage';

function isPromiseLike<T>(value: Promise<T> | void): value is Promise<T> {
  return Boolean(value && typeof (value as Promise<T>).then === 'function');
}

function readFromChromeStorage(name: string) {
  const storageArea = getChromeStorageArea();

  if (!storageArea?.get) {
    return Promise.resolve(webStateStorage.getItem(name));
  }

  return new Promise<string | null>((resolve, reject) => {
    try {
      const maybePromise = storageArea.get?.(name, (items) => {
        resolve(items[name] ?? null);
      });

      if (isPromiseLike(maybePromise)) {
        maybePromise.then((items) => resolve(items[name] ?? null)).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function writeToChromeStorage(name: string, value: string) {
  const storageArea = getChromeStorageArea();

  if (!storageArea?.set) {
    webStateStorage.setItem(name, value);
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    try {
      const maybePromise = storageArea.set?.({ [name]: value }, () => resolve());

      if (isPromiseLike(maybePromise)) {
        maybePromise.then(() => resolve()).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function removeFromChromeStorage(name: string) {
  const storageArea = getChromeStorageArea();

  if (!storageArea?.remove) {
    webStateStorage.removeItem(name);
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    try {
      const maybePromise = storageArea.remove?.(name, () => resolve());

      if (isPromiseLike(maybePromise)) {
        maybePromise.then(() => resolve()).catch(reject);
      }
    } catch (error) {
      reject(error);
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
