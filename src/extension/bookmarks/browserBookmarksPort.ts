import type {
  BrowserBookmarksPort,
  BrowserBookmarkTreeNode,
} from '../../core/ports/BrowserBookmarksPort';
import {
  getChromeBookmarksApi,
  getChromePermissionsApi,
  getChromeRuntimeApi,
  type ChromeBookmarkTreeNode,
} from '../runtime/chrome';

const BOOKMARKS_PERMISSION = { permissions: ['bookmarks'] };

function getLastChromeErrorMessage() {
  return getChromeRuntimeApi()?.lastError?.message;
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
  return Boolean(value && typeof (value as Promise<T>).then === 'function');
}

async function requestBookmarkPermission() {
  const permissions = getChromePermissionsApi();

  if (!permissions?.request) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let didSettle = false;
    const settle = (value: boolean) => {
      if (!didSettle) {
        didSettle = true;
        resolve(value);
      }
    };
    const maybePromise = permissions.request?.(BOOKMARKS_PERMISSION, (granted) => {
      settle(Boolean(granted) && !getLastChromeErrorMessage());
    });

    if (isPromiseLike<boolean>(maybePromise)) {
      void maybePromise.then((granted) => settle(Boolean(granted))).catch(() => settle(false));
    } else if (maybePromise === undefined) {
      queueMicrotask(() => {
        if (!didSettle && getLastChromeErrorMessage()) {
          settle(false);
        }
      });
    }
  });
}

async function readBookmarkTree() {
  const bookmarks = getChromeBookmarksApi();

  if (!bookmarks?.getTree) {
    throw new Error('Browser bookmarks API is not available.');
  }

  return new Promise<ChromeBookmarkTreeNode[]>((resolve, reject) => {
    let didSettle = false;
    const settle = (nodes: ChromeBookmarkTreeNode[]) => {
      if (!didSettle) {
        didSettle = true;
        resolve(nodes);
      }
    };
    const fail = (error: unknown) => {
      if (!didSettle) {
        didSettle = true;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };
    const maybePromise = bookmarks.getTree?.((nodes) => {
      const message = getLastChromeErrorMessage();

      if (message) {
        fail(new Error(message));
        return;
      }

      settle(nodes);
    });

    if (isPromiseLike<ChromeBookmarkTreeNode[]>(maybePromise)) {
      void maybePromise.then(settle).catch(fail);
    }
  });
}

export const browserBookmarksPort: BrowserBookmarksPort = {
  isSupported() {
    return Boolean(getChromePermissionsApi()?.request);
  },
  async requestTree(): Promise<BrowserBookmarkTreeNode[]> {
    const granted = await requestBookmarkPermission();

    if (!granted) {
      throw new Error('Browser bookmarks permission was not granted.');
    }

    return readBookmarkTree();
  },
};
