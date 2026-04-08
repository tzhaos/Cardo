type ChromeTabsApi = {
  create?: (createProperties: { url: string }) => Promise<unknown> | void;
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
  tabs?: ChromeTabsApi;
  runtime?: object;
  storage?: {
    local?: ChromeStorageArea;
  };
};

export function getChromeLikeRuntime(): ChromeLikeRuntime | undefined {
  return (globalThis as typeof globalThis & { chrome?: ChromeLikeRuntime }).chrome;
}

export function getChromeStorageArea() {
  return getChromeLikeRuntime()?.storage?.local;
}
