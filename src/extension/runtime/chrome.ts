type ChromeTabsApi = {
  create?: (createProperties: { url: string }) => Promise<unknown> | void;
};

export type ChromeBookmarkTreeNode = {
  id?: string;
  title?: string;
  url?: string;
  dateAdded?: number;
  children?: ChromeBookmarkTreeNode[];
};

type ChromeBookmarksApi = {
  getTree?: (
    callback?: (nodes: ChromeBookmarkTreeNode[]) => void,
  ) => Promise<ChromeBookmarkTreeNode[]> | void;
};

type ChromePermissionsRequest = {
  permissions?: string[];
  origins?: string[];
};

type ChromePermissionsApi = {
  request?: (
    permissions: ChromePermissionsRequest,
    callback?: (granted: boolean) => void,
  ) => Promise<boolean> | void;
};

type ChromeLikeRuntime = {
  bookmarks?: ChromeBookmarksApi;
  permissions?: ChromePermissionsApi;
  tabs?: ChromeTabsApi;
  runtime?: {
    getURL?: (path: string) => string;
    lastError?: {
      message?: string;
    };
    sendMessage?: (
      message: unknown,
      callback?: (response: unknown) => void,
    ) => Promise<unknown> | void;
    sendNativeMessage?: (
      application: string,
      message: unknown,
      callback?: (response: unknown) => void,
    ) => Promise<unknown> | void;
  };
};

export function getChromeLikeRuntime(): ChromeLikeRuntime | undefined {
  return (globalThis as typeof globalThis & { chrome?: ChromeLikeRuntime }).chrome;
}

export function getChromeBookmarksApi() {
  return getChromeLikeRuntime()?.bookmarks;
}

export function getChromePermissionsApi() {
  return getChromeLikeRuntime()?.permissions;
}

export function getChromeRuntimeApi() {
  return getChromeLikeRuntime()?.runtime;
}
