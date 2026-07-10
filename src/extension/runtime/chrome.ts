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

type ChromeStorageArea = {
  get?: (
    keys: string,
    callback?: (items: Record<string, string | undefined>) => void,
  ) => Promise<Record<string, string | undefined>> | void;
  set?: (items: Record<string, string>, callback?: () => void) => Promise<void> | void;
  remove?: (keys: string, callback?: () => void) => Promise<void> | void;
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
  storage?: {
    local?: ChromeStorageArea;
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

export function getChromeStorageArea() {
  return getChromeLikeRuntime()?.storage?.local;
}

export function getChromeRuntimeApi() {
  return getChromeLikeRuntime()?.runtime;
}
