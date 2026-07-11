import type { AppPorts } from '../../core/ports/AppPorts';
import { getDesktopBridge } from '../bridge';
import { fetchWebDavPort } from '../sync/fetchWebDavPort';
import { databaseExecuteResponseSchema } from '../../core/contracts/database';

export function createDesktopPorts(): AppPorts {
  return {
    browserBookmarks: {
      isSupported: () => false,
      requestTree: async () => {
        throw new Error('Browser bookmarks import is only available in the browser extension.');
      },
    },
    database: {
      execute: async (request) =>
        databaseExecuteResponseSchema.parse(await getDesktopBridge().databaseExecute(request)),
    },
    clipboard: {
      readText: () => getDesktopBridge().readClipboardText(),
      writeText: (text) => getDesktopBridge().writeClipboardText(text),
    },
    fileExport: {
      downloadJson: (filename, payload) => {
        void getDesktopBridge().saveJson(filename, payload);
      },
      downloadText: (filename, payload) => {
        void getDesktopBridge().saveText(filename, payload);
      },
    },
    fileImport: {
      readText: (source) => {
        if (!(source instanceof File)) {
          throw new Error('Desktop file import requires a File object.');
        }

        return source.text();
      },
    },
    tabs: {
      openUrl: (url) => {
        void getDesktopBridge().openExternal(url);
      },
    },
    runtimeDocument: {
      setDocumentTitle: (title) => {
        document.title = title;
      },
      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme;
      },
      addWindowListener: (type, listener) => {
        window.addEventListener(type, listener as EventListener);
      },
      removeWindowListener: (type, listener) => {
        window.removeEventListener(type, listener as EventListener);
      },
      getViewport: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    },
    localResource: {
      requestOpen: async (resourcePath) => {
        const result = await getDesktopBridge().openLocalResource(resourcePath);
        return result.ok
          ? { status: 'requested' }
          : { status: 'failed', errorMessage: result.error };
      },
    },
    webDav: fetchWebDavPort,
    websiteIcons: {
      resolve: (url) => getDesktopBridge().resolveWebsiteIcon(url),
    },
  };
}
