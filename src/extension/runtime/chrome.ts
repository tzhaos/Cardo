type ChromeTabsApi = {
  create?: (createProperties: { url: string }) => Promise<unknown> | void;
};

type ChromeLikeRuntime = {
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

export function getChromeRuntimeApi() {
  return getChromeLikeRuntime()?.runtime;
}
